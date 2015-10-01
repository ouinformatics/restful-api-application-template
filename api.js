$(function() {
    //Customize by setting base_url to cybercom/api docker application
    base_url = "http://mgmic.oscer.ou.edu/api";
    //base_url = "http://192.168.99.100/api";
    //No other alterations is need to get the standard applicaiton running!
    login_url = base_url + "/api-auth/login/?next=";
    logout_url = base_url + "/api-auth/logout/?next=";
    user_task_url = base_url + "/queue/usertasks/.json?page_size=5";
    user_url = base_url + "/user/?format=json";
    task_url = base_url + "/queue/run/mgmicq.tasks.tasks.mgmic_qc_workflow/.json";
    task_url_file = base_url + "/queue/file-upload/";
    gene_database_url = base_url + "/catalog/data/data_portal/gene_database/.json?page_size=0"
    task_data = {"function": "mgmicq.tasks.tasks.mgmic_qc_workflow","queue": "celery","args":[],"kwargs":{},"tags":[]};
    amplicon_data = {"function": "mgmicq.tasks.tasks.amplicon_workflow","queue": "celery","args":[],"kwargs":{},"tags":[]};
    prevlink=null;nextlink=null;poll_url="";total_fgs=null;curent_fgs=0;result_obj=null;
    total_fgs_dbs=[]
    set_auth(base_url,login_url);

    $("#aprofile").click(function(){activaTab('profile')});
    $("#alogout").click(function(){window.location = logout_url.concat(document.URL);});
    load_task_history(user_task_url);
    $('#prevlink').click(function(){load_task_history(prevlink);});
    $('#nextlink').click(function(){load_task_history(nextlink);});
    Handlebars.registerHelper('json_metatags', function(context) {
      //return JSON.stringify(context,null, 0);
        if (typeof context !== 'undefined') {
          //console.log(context);
            temp={};
            try{
              temp['Sample-Name'] = context[0]['sample_name'];
              temp['Sample-Type'] = context[0]['sample-type'];
            }catch(err) {
            };
            return JSON.stringify(temp,null, 0).replace('\n','').replace(/\\n/g,'').replace(/,/g,'\n').replace(/\{/g,'').replace(/\}/g,'').replace(/\ /g,'').replace(/:,/g,' = None').replace(/:/g,' = ').replace(/"/g,'').replace(/\[/g,'').replace(/\]/g,'').replace(/,/g,', ');
        }else{
            return ""
        }
    });
    Handlebars.registerHelper('time_zone',function(context){
        temp = new Date(context + "Z");
        return temp.toLocaleDateString() + "  " + temp.toLocaleTimeString();
    });
    set_task_form();
    $('#output').hide();
    options= {
        target: '#task_result',
        type:'post',
        url:task_url_file,
        dataType: 'json',
        beforeSubmit: validate,
        uploadProgress: function(event, position, total, percentComplete) {
            //console.log(percentComplete)
            var percentVal = percentComplete + '%';
            $('.bar').width(percentVal);
            $('.percent').html(percentVal);
        },
        success: function(data) {
            $('#foward_url').val(data.forward_file);
            $('#reverse_url').val(data.reverse_file);
            task_submit();
        },
        error: file_upload_error
    }; 
    check_options= {
        type:'post',
        url:task_url_file,
        dataType: 'json',
        //beforeSubmit: amplicon_validate,
        /*uploadProgress: function(event, position, total, percentComplete) {
            //console.log(percentComplete)
            var percentVal = percentComplete + '%';
            $('.bar').width(percentVal);
            $('.percent').html(percentVal);
        },*/
        success: function(data) {
            $("#map_url").val(data.map_file)
            $('.step2_label').text(data.map_file)
            check_map_submit_url();        
        },
        error: file_upload_error
    };
    amplicon_options= {
        target: '#task_result',
        type:'post',
        url:task_url_file,
        dataType: 'json',
        beforeSubmit: amplicon_validate,
        uploadProgress: function(event, position, total, percentComplete) {
            //console.log(percentComplete)
            var percentVal = percentComplete + '%';
            $('.bar').width(percentVal);
            $('.percent').html(percentVal);
        },
        success: function(data) {
            $('#amplicon_foward_url').val(data.forward_file);
            $('#amplicon_reverse_url').val(data.reverse_file);
            amplicon_task_submit();
        },
        error: file_upload_error
    };
    
    $('#newSample').click(function(){location.reload();});
    $("#fgs_btn").click(function(){select_fgs();});
    load_gene_database();
    $('#fgs_select').click(function(){select_dbs();})
    $('#fgs_unselect').click(function(){unselect_dbs();})
    $("#myModal_gene").on('hidden.bs.modal', function () {
      temp=[]
      $("#selected_dbs option").each(function(){
        temp.push($(this).val())
      });
      console.log(temp)
      $('#visual_fgs').val(temp.join(', '))
      total_fgs_dbs=temp
    });
    $('#myModal').on('hidden.bs.modal', function () {
       $('#my-modal-body').empty();
    });
    // Sample type determine which form is visible
    $("#hide_amplicon").hide();
    $('input:radio[name=sample-type]').change(function(){
        if (this.value == 'metagenome'){
            $('#hide_metagenomic').show();
            $("#hide_amplicon").hide();
            console.log('metagenome');
        }else if (this.value=='amplicon'){
            $('#hide_metagenomic').hide()
            $("#hide_amplicon").show()
            console.log('amplicon');
        }
    });
    $('#check_map_url').click(function(){check_map_submit('url');});
    $('#check_map_file').click(function(){check_map_submit('file');});
    $('#amplicon_file_form_submit').click(function(){amplicon_submit('file');});
    $('#amplicon_url_form_submit').click(function(){amplicon_submit('url');});
    $('.step2').hide()
});//End of Document Ready
function file_upload_error(){
    alert('Error occured communicating to API. Please submit again.');
}
function amplicon_submit(submit_type){
    if (submit_type=="url"){
        amplicon_task_submit();
    }else{
        amplicon_task_submit_file();
    };
};
function amplicon_task_submit_file(){
    //$("#file-up").addClass("active");
    //set_result_template({});
    //set_amplicon_result();
    $("#amplicon_task_form_file").ajaxSubmit(amplicon_options);
    return false;
};
function set_amplicon_result(){
 //Set result title
 $('#task_submit').hide();
 $('#output').show();
 $('#result_title').empty();
 $('#result_title').append("<h3>Amplicon Workflow</h3>");
 $('#result_title').append('<b>STATUS:</b> PENDING <img src="spinner.gif" id="amplicon_result_spinner" height="20" width="20" style="margin-left:2px;">');
}
function amplicon_task_submit(){
    //Turn off file upload progress if nothing to upload
    if(!$('#file-up').hasClass("active")){
        $('#file-up').hide();
    };
    //set_result_template({});
    if (!amplicon_validate_url()){
        return false;
    };
    form_data= $('#amplicon_form1').serializeObject();
    temp = $('#amplicon_form1').serializeObject();
    delete temp.csrfmiddlewaretoken
    delete temp.args
    amplicon_data.args = form_data.args;
    amplicon_data.tags = [temp]
    //task_data.kwargs.functional_gene = total_fgs_dbs
    $('#task_result').empty();
    set_amplicon_result();
    $.postJSON(base_url + "/queue/run/mgmicq.tasks.tasks.amplicon_workflow/.json",amplicon_data,function(data){
        //Reload task history to include the last run
        load_task_history(user_task_url);
        //Enable button to allow for new submission
        $('#newSample').removeAttr('disabled');
        $('#task_result').empty();
        $('#task_result').append("<pre>" + JSON.stringify(data,null, 4) + "</pre>");
        $('#task_result').urlize();
        //Poll main Task
        amplicon_poll(data.result_url + "/.json")
        }, function(xhr,textStatus,err){
            $('#task_result').empty();
            $('#task_result').append("<pre>" + JSON.stringify({"ERROR":textStatus},null, 4) + "</pre>");
        });
    return false;
}
function amplicon_poll(url){
    $.ajax({ url:url , success: function(data) {
            if (data.result.status=="PENDING"){
                $('#task_result').empty();
                $('#task_result').append("<pre>" + JSON.stringify(data.result,null, 4) + "</pre>");
                setTimeout(function() { amplicon_poll(url); }, 3000);
            }else{
                $('#task_result').empty();
                //Turn off tilte spinner
                $('#result_title').empty();
                $('#result_title').append("<h3>Amplicon Workflow</h3>");
                //set result without children. Not neccesary in amplicon
                temp = data.result;
                delete temp.children;
                result_obj=temp;
                $('#task_result').append("<pre>" + JSON.stringify(temp,null, 4) + "</pre>");
                $('#task_result').urlize();
            };
       }});
}
function amplicon_validate(){
    if (!$('#amplicon_sample_name').val()){
        alert('Please provide Sample Name.');
        return false;
    };
    if (!$('#amplicon_task_form_file input[name="forward_file"]').val() || !$('#amplicon_task_form_file input[name="reverse_file"]').val()){
        alert('Please provide both Forward and Reverse urls or Forward and Reverse file upload.');
        return false;
    }
    $("#file-up").addClass("active");
    set_amplicon_result();
    return true;
    //console.log("Write validate");
}
function amplicon_validate_url(){
    if (!$('#amplicon_sample_name').val()){
        alert('Please provide Sample Name.');
        return false;
    };
    if(!$('#amplicon_foward_url').val() || !$('#amplicon_reverse_url').val()){
        alert('Please provide both Forward and Reverse urls or Forward and Reverse file upload.');
        return false;
    };
    set_amplicon_result();
    //$('#task_submit').hide();
    //$('#output').show();
    return true;
}
function toggle_check_map_buttons(){
    if($('#check_map_url').hasClass("disabled")){
        $('#check_map_url').removeClass("disabled")
        $('#check_map_file').removeClass("disabled")
    }else{
        $('#check_map_url').addClass("disabled")
        $('#check_map_file').addClass("disabled")
    }
}
function validate_check(check_type){
    if(check_type=="url"){
        return !!$('#map_url').val();
    }else{
        return !!$('#map_file').val();
    }
}
function check_map_submit(submit_type){
    if (submit_type=="url"){
        if(validate_check("url")){
            toggle_check_map_buttons();
            check_map_submit_url();
            $('#check_map_url_spinner').show();
        }else{
            alert("Please input Map File Url.");
        }
    }else{
        if(validate_check("file")){
            toggle_check_map_buttons();
            check_map_submit_file();
            $('#check_map_file_spinner').show();
        }else{
            alert("Please input Map File.");
        }
    }
};
function check_map_submit_file(){
    $("#amplicon_task_form_file").ajaxSubmit(check_options);
    return false;
}
function check_map_submit_url(){
    data = {filename:$("#map_url").val(),"csrftoken":getCookie('csrftoken')}
    $.post(base_url + "/mgmic/check-mapfile/.json",data,function(data){
        if (data.status =="SUCCESS"){
            $('.step1').hide()
            $('.step2').show()
            $('.step2_label').text($("#map_url").val())
        }else{
            alert("Please fix map file and resubmit!. \n\n" + data.log);
            toggle_check_map_buttons();
            $('#check_map_file_spinner').hide();
            $('#check_map_url_spinner').hide();
            $("#map_url").val('');
        }
    },"json")
    .fail(function(){
        alert("Error communicating with rest api server. Please re-submit Check Map File.")
    });
}
function load_gene_database(){
  $.getJSON(gene_database_url,function(data){
    temp=[];
    $.each(data.results,function(key,value){
      $('#all_dbs')
          .append($("<option></option>")
          .attr("value",value.name)
          .text(value.name));
      if(value.type=="default"){
        temp.push(value.name);
        $("#selected_dbs")
          .append($("<option></option>")
          .attr("value",value.name)
          .text(value.name));
        }
    });
    $('#visual_fgs').val(temp.join(', '));
    total_fgs_dbs=temp;
  });
}
function select_dbs(){
  $('#all_dbs :selected').each(function(i, selected){
    if(!$("#selected_dbs option[value='" + $(selected).text() + "']").length > 0){
      $("#selected_dbs")
        .append($("<option></option>")
        .attr("value",$(selected).text())
        .text($(selected).text()));
    }
  });
}
function unselect_dbs(){
  $('#selected_dbs :selected').each(function(i, selected){
    $("#selected_dbs option[value='" + $(selected).text() + "']").remove();
  });
}
function task_submit_file(){
    $("#file-up").addClass("active");
    set_result_template({});
    $("#task_form_file").ajaxSubmit(options);
    return false;
};
function validate(formData, jqForm, options) {

    var forwardValue = $('input[name=forward_file]').fieldValue();
    var reverseValue = $('input[name=reverse_file]').fieldValue();
    if (!$('#sample_name').val()){
        alert('Please provide Sample Name.');
        return false;
    };
    if (!forwardValue[0] || !reverseValue[0]) {
        alert('Please input both Forward Read and Reverse Read files.');
        return false;
    };
    $('#task_submit').hide();
    $('#output').show();
};
function validate_url(){

    if (!$('#sample_name').val()){
        alert('Please provide Sample Name.');
        return false;
    };
    if(!$('#foward_url').val() || !$('#reverse_url').val()){
        alert('Please provide both Forward and Reverse urls or Forward and Reverse file upload.');
        return false;
    };
    $('#task_submit').hide();
    $('#output').show();
    return true;
};
function set_result_template(data){

  if(!$('#file-up').hasClass("active")){
    $('#file-up').hide();
  };

  if (!$('#results').hasClass("active")){
    $('#results').empty();
    temp = Handlebars.templates['tmpl-result'];
    $('#results').append(temp(data));
    $('#results').addClass("active");

  };
};
function set_task_form(){
    data = {"csrftoken":getCookie('csrftoken')};
    temp = Handlebars.templates['tmpl-task'];
    $('#home').empty();
    $('#home').append(temp(data));
};
function task_submit(){
    set_result_template({});
    if (!validate_url()){
        return false;
    };
    form_data= $('#task_form').serializeObject();
    temp = $('#task_form').serializeObject();
    delete temp.csrfmiddlewaretoken
    delete temp.args
    task_data.args = form_data.args;
    task_data.tags = [temp]
    task_data.kwargs.functional_gene = total_fgs_dbs
    $('#task_result').empty();
    $.postJSON(task_url,task_data,function(data){
        //Set Quality control status
        set_workflow_status('qc',{status:"PENDING",progress_display:"inline",success_display:"none"});
        //Reload task history to include the last run
        load_task_history(user_task_url);
        //Enable button to allow for new submission
        $('#newSample').removeAttr('disabled');
        //Poll main Task
        poll_url=data.result_url + "/.json";
        poll();
        }, function(xhr,textStatus,err){
            $('#task_result').empty();
            $('#task_result').append("<pre>" + JSON.stringify({"ERROR":textStatus},null, 4) + "</pre>");
        });
    return false;
};
function set_workflow_status(id,data){
    temp = Handlebars.templates['tmpl-status'];
    $('#' + id + " td:nth-child(2)").html(temp(data));
};
function poll() {
       $.ajax({ url:poll_url , success: function(data) {
            //console.log(data);
            if (data.result.status=="PENDING"){
                $('#task_result').empty();
                $('#task_result').append("<pre>" + JSON.stringify(data.result,null, 4) + "</pre>");
                setTimeout(function() { poll(); }, 3000);
            }else{
                $('#task_result').empty();
                if (data.result.status=="SUCCESS"){
                  set_workflow_status('qc',{status:data.result.status,progress_display:"none",success_display:"inline"});
                  $('#qc').addClass("success");
                  subtask_poll(data);


                }else{
                  set_workflow_status('qc',{status:data.result.status,progress_display:"none",success_display:"none"});
                  $('#qc').addClass("danger");
                };
                temp = data.result;
                delete temp.children;
                result_obj=temp;
                $('#task_result').append("<pre>" + JSON.stringify(temp,null, 4) + "</pre>");
                $('#task_result').urlize();
            };
       }});
};
function subtask_poll(data){
  children = data.result.children;
  len = children.length;
  idx=0;
  try{
    s16_id =children[1][0][0];
    idx++;
    poll_subtask(s16_id,'s16');
  }catch(err) {
    sts = "No subtask for 16S Classification";
    set_workflow_status("s16",{status:sts,progress_display:"none",success_display:"none"});
  };
  try{
    aray_id = children[0][0][0];
    idx++;
    poll_subtask(aray_id,'aray');
  }catch(err) {
    sts = "No subtask for Assemble Ray";
    set_workflow_status("aray",{status:sts,progress_display:"none",success_display:"none"});
  };
  try{
    report_id=children[len-1][0][0]
    poll_subtask(report_id,'report');
  }catch(err){
    sts="No subtask for report generation"
    set_workflow_status("report",{status:sts,progress_display:"none",success_display:"none"});
  };
  fgs_id=[];
  for (i = idx; i < len -2 ; i++) {
    total_fgs++;
    fgs_id.push(children[i][0][0]);
  };
  if (fgs_id.length==0){
    set_workflow_status("fgs",{status:"None Submitted.",progress_display:"none",success_display:"none"});
  }

  $.each(fgs_id,function(idx,value){ poll_subtask(value,'fgs') });
};
function poll_subtask(task_id,html_id){
   $.ajax({ url:"http://mgmic.oscer.ou.edu/api/queue/task/" + task_id + "/.json" , success: function(data) {
        if (data.status=="PENDING"){
          if(html_id=="fgs"){
            sts = data.status + " " + curent_fgs + " out of " + total_fgs + " Completed";
            set_workflow_status(html_id,{status:sts,progress_display:"inline",success_display:"none"});
          }else{
            set_workflow_status(html_id,{status:data.status,progress_display:"inline",success_display:"none"});
          }
          setTimeout(function() { poll_subtask(task_id,html_id); }, 3000);
        }else if (data.status=="RETRY"){
          setTimeout(function() { poll_subtask(data.children[0][0][0],html_id); }, 3000);
        }else{
          if (data.status=="SUCCESS"){
            if(html_id=="fgs"){
              curent_fgs = curent_fgs +1;
              sts = data.status + " " + curent_fgs + " out of " + total_fgs + " Completed";
              if (curent_fgs == total_fgs){
                  set_workflow_status(html_id,{status:sts,progress_display:"none",success_display:"inline"});
                  $('#' + html_id).addClass("success");
              }else{
                  sts = "PENDING " + curent_fgs + " out of " + total_fgs + " Completed";
                  set_workflow_status(html_id,{status:sts,progress_display:"inline",success_display:"none"});
              }
            }else if(html_id=="report"){
              data_url = result_obj.result;
              data_report_url = data.result;
              delete result_obj.result;
              result_obj.data=data_url;
              result_obj.report= data_report_url;
              $('#task_result').empty();
              $('#task_result').append("<pre>" + JSON.stringify(result_obj,null, 1) + "</pre>");
              $('#task_result').urlize();
            }else{
              set_workflow_status(html_id,{status:data.status,progress_display:"none",success_display:"inline"});
              $('#' + html_id).addClass("success");
            }
          }else{
            if(html_id=="fgs"){
              sts = data.status + " " + curent_fgs + " out of " + total_fgs + " Completed";
              set_workflow_status(html_id,{status:sts,progress_display:"none",success_display:"none"});
              $('#' + html_id).addClass("danger");
            }else{
              set_workflow_status(html_id,{status:data.status,progress_display:"none",success_display:"none"});
              $('#' + html_id).addClass("danger");
            }
          }
        }}});
};
$.postJSON = function(url, data, callback,fail) {
    return jQuery.ajax({
        'type': 'POST',
        'url': url,
        'contentType': 'application/json',
        'data': JSON.stringify(data),
        'dataType': 'json',
        'success': callback,
        'error':fail,
        'beforeSend':function(xhr, settings){
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });
};
function submit_user(){
    $.post( user_url,$('#user_form').serializeObject(),function(data){
        data.csrftoken = getCookie('csrftoken');
        $('#profile').empty();
        user_template = Handlebars.templates['tmpl-user'];
        $('#profile').append(user_template(data));
        $('#user_form').hide();
        $('#view_form').show();
        $('#reset_password').click(function(){$('#pass_form').toggle(!$('#pass_form').is(':visible'));});
    })
    .fail(function(){ alert("Error Occured on User Update.")});
    return false;
};
function edit_user(){
    $('#user_form').show();
    $('#view_form').hide();
    return false;
};
function set_password(){
    pass = $('#pass_form').serializeObject();
    if (pass.password !== pass.password2){
        alert("Passwords where not identical");
        return false;

    };
    $.post( user_url,$('#pass_form').serializeObject(),function(data){
        $('#reset_password').click(function(){$('#pass_form').toggle(!$('#pass_form').is(':visible'));});
        alert(JSON.stringify(data));
    })
    .fail(function(){ alert("Error Occured on Password Reset.")});
    return false;
};
function set_auth(base_url,login_url){
    $.getJSON( base_url + "/user/.json",function(data){
        $('#user').html(data['username'].concat( ' <span class="caret"></span> '));
        $("#user").append($('<img style="border-radius:80px;">').attr("src",data['gravator_url'] + "?s=40&d=mm") );
        data.csrftoken = getCookie('csrftoken');
        user_template = Handlebars.templates['tmpl-user'];
        $('#profile').append(user_template(data));
        $('#user_form').hide();
        $('#view_form').show();
        $('#reset_password').click(function(){$('#pass_form').toggle(!$('#pass_form').is(':visible'));});
    })
    .fail(function() {
        var slink = login_url.concat(document.URL);
        window.location = slink;
    });
};
function activaTab(tab){
    $('a[href="#' + tab + '"]').tab('show');
};
function load_task_history(url){
    $.getJSON(url, function(data){
    prevlink = data.previous;
    nextlink = data.next;
    if (prevlink == null){$('#li_prevlink').addClass("disabled");} else {$('#li_prevlink').removeClass("disabled");};
    if (nextlink == null){$('#li_nextlink').addClass("disabled");} else {$('#li_nextlink').removeClass("disabled");};
    setTaskDisplay(data);
    tr_template = Handlebars.templates['tmpl-tr'];
    $('#result_tbody').html("");//clear table
    $.each(data.results, function(i, item) {
        temp=item.task_name.split('.');
        if (temp[temp.length-1]=="mgmic_qc_workflow"){
          item['task_name']= "Metagenome Workflow";
        }else if (temp[temp.length-1]=="amplicon_workflow"){
          item['task_name']= "Amplicon Workflow";
        }else{
          item['task_name']= temp[temp.length-1];
        }

        item.timestamp = item.timestamp ;//.substring(0,19).replace('T',' ')
        $('#result_tbody').append(tr_template(item));
    });
    });
};
function setTaskDisplay(data){
    if (data.count <= data.meta.page_size){
        $('#task_count').text('Task 1 - ' + data.count +  ' Total ' + data.count );
    }else{
        rec_start = data.meta.page_size*data.meta.page - data.meta.page_size +1;
        rec_end = "";
        if(data.meta.page_size*data.meta.page >= data.count){
            rec_end = data.count;
        }else{
            rec_end = data.meta.page_size*data.meta.page;
        };
        $('#task_count').text('Task ' + rec_start + ' - ' + rec_end  +  ' Total ' + data.count );
    };

};
function showResult(task_id){
    //set iframe url
    iframe_url = 'http://mgmic.oscer.ou.edu/portal/history_result_meta.html?task_id=' + task_id //257fc120-ff53-495d-95c0-246ebc85e20e
    template =  Handlebars.templates['tmpl-iframe'];
    $('#my-modal-body').append(template({}));
    $('#myIframe').attr('src',iframe_url);
    $("#myModal").modal('show');
};
function select_fgs(){
    $("#myModal_gene").modal('show');
};
jQuery.fn.urlize = function() {
    if (this.length > 0) {
        this.each(function(i, obj){
            // making links active
            var x = $(obj).html();
            var list = x.match( /\b(http:\/\/|www\.|http:\/\/www\.)[^ <]{2,200}\b/g );
            if (list) {
                for ( i = 0; i < list.length; i++ ) {
                    var prot = list[i].indexOf('http://') === 0 || list[i].indexOf('https://') === 0 ? '' : 'http://';
                    x = x.replace( list[i], "<a target='_blank' href='" + prot + list[i] + "'>"+ list[i] + "</a>" );
                }

            }
            $(obj).html(x);
        });
    }
};
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }}return cookieValue;
};
