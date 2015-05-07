$(function() {
    //Customize by setting base_url to cybercom/api docker application
    base_url = "http://data.southcentralclimate.org/api";
    //No other alterations is need to get the standard applicaiton running!
    login_url = base_url + "/api-auth/login/?next=";
    logout_url = base_url + "/api-auth/logout/?next=";
    user_task_url = base_url + "/queue/usertasks/.json?page_size=10";
    user_url = base_url + "/user/?format=json";
    task_url = base_url + "/queue/run/cscq.data.concat.ncrcat/.json"
    task_data = {"function": "cscq.data.concat.ncrcat","queue": "celery","args":[],"kwargs":{},"tags":[]}
    prevlink=null;nextlink=null;
    set_auth(base_url,login_url);
    $("#aprofile").click(function(){activaTab('profile')})
    $("#alogout").click(function(){window.location = logout_url.concat(document.URL);})
    load_task_history(user_task_url);
    $('#prevlink').click(function(){load_task_history(prevlink);});
    $('#nextlink').click(function(){load_task_history(nextlink);});
    Handlebars.registerHelper('json_metatags', function(context) {
                if (typeof context !== 'undefined') {
                    return JSON.stringify(context).replace(/"/g,'').replace(/\[/g,'').replace(/\]/g,'').replace(/,/g,', ');
                }else{
                    return ""
                } 
    });
    set_cmip5_form();
    $('#parameter').change(function(){set_cmip5_domain();});
    all_model=[];
});//End of Document Ready
function task_submit(){
    form_data= $('#task_form').serializeObject()
    task_data.args = form_data.args 
    $('#task_result').empty();
    $.postJSON(task_url,task_data,function(data){
        $('#task_result').empty();
        $('#task_result').append("<pre>" + JSON.stringify(data,null, 4) + "</pre>")
        $('#task_result').urlize();
        //Reload task history to include the last run
        load_task_history(user_task_url);
        }, function(xhr,textStatus,err){
            $('#task_result').empty();
            $('#task_result').append("<pre>" + JSON.stringify({"ERROR":textStatus},null, 4) + "</pre>")
        });
    return false;
}
$.postJSON = function(url, data, callback,fail) {
    return jQuery.ajax({
        'type': 'POST',
        'url': url,
        'contentType': 'application/json',
        'data': JSON.stringify(data),
        'dataType': 'json',
        'success': callback,
        'error':fail
        /*'beforeSend':function(xhr, settings){
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }*/
    });
};
function set_cmip5_form(){
    //tmpl-cmip5.handlebars  tmpl-option.handlebars
    $('#home').empty()
    tmpl_cmip5 =  Handlebars.templates['tmpl-cmip5']
    $('#home').append(tmpl_cmip5({'csrftoken':getCookie('csrftoken')}))
    set_cmip5_select("variable",null,"parameter");
}
function set_cmip5_domain(){
    $('#domain').unbind();
    $('#domain_div').empty()
    $('#experiment_div').empty()
    $('#ensemble_div').empty()
    $('#model_div').empty()
    tmpl_select =  Handlebars.templates['tmpl-select']
    $('#domain_div').append(tmpl_select({'id':'domain','label':'Temporal Resolution'}))
    $('#domain').change(function(){set_cmip5_experiment();});
    variable = 'domain'
    query = "{'spec':{'variable':'" + $('#parameter').val() + "'}}"
    set_cmip5_select(variable,query,variable);
}
function set_cmip5_experiment(){
    $('#experiment').unbind()
    $('#experiment_div').empty()
    $('#ensemble_div').empty()
    $('#model_div').empty()
    tmpl_select =  Handlebars.templates['tmpl-select']
    $('#experiment_div').append(tmpl_select({'id':'experiment','label':'Projections'}))
    $('#experiment').change(function(){set_cmip5_model();});
    variable = 'experiment'
    query = "{'spec':{'variable':'" + $('#parameter').val() + "','domain':'" + $('#domain').val() +  "'}}"
    set_cmip5_select(variable,query,variable);
}
function set_cmip5_model(){
    $('#model').unbind();
    $('#model_div').empty()
    $('#ensemble_div').empty()
    tmpl_select =  Handlebars.templates['tmpl-select']
    $('#model_div').append(tmpl_select({'id':'model','label':'Model'}))
    $('#model').change(function(){set_cmip5_ensemble();});
    variable = 'model'
    query = "{'spec':{'variable':'" + $('#parameter').val() + "','domain':'" + $('#domain').val() +  "','experiment':'" + $('#experiment').val() + "'}}"
   // query = query + "','ensemble':'" + $('#ensemble').val()  + "'}}"
    set_cmip5_select(variable,query,variable);
}
function set_cmip5_ensemble(){
    $('#ensemble').unbind()
    $('#ensemble_div').empty()
    tmpl_select =  Handlebars.templates['tmpl-select']
    $('#ensemble_div').append(tmpl_select({'id':'ensemble','label':'Ensemble'}))
    $('#ensemble').change(function(){set_result();});
    variable = 'ensemble'
    query = "{'spec':{'variable':'" + $('#parameter').val() + "','domain':'" + $('#domain').val() +  "','experiment':'" + $('#experiment').val() 
    if ($('#model').val()=="all"){
        query = query + "'}}"
    }else{
        query = query + "','model':'" + $('#model').val() + "'}}"
    }
    set_cmip5_select(variable,query,variable);
}
function set_result(){
    $('#task_result').empty()
    url = "http://data.southcentralclimate.org/api/catalog/data/data_portal/cmip5_files/.json?page_size=0&"
    query = "{'spec':{'variable':'" + $('#parameter').val() + "','domain':'" + $('#domain').val() +  "','experiment':'" + $('#experiment').val()
    if ($('#model').val()=="all"){
        query = query + "','ensemble':'" + $('#ensemble').val() +  "'},'$orderby':{'time':1}}"
    }else{
        query = query + "','ensemble':'" + $('#ensemble').val() + "','model':'" + $('#model').val() + "'},'$orderby':{'time':1}}"
    }
    $.getJSON(url + "query=" + query, function(data){
        var totalsize = 0;
        var models =[]
        $.each(data.results,function(key,item){
            var temp="";
            //console.log(item);
            models.push(item.model);
            temp = item.size;
            temp = temp.replace("K",'');
            totalsize=totalsize + +temp ;   
        });
        all_model= $.unique(models)
        $('#task_result').append("<pre>Total Size = " + totalsize.toString() + "  "  + JSON.stringify(data, null, 4) + "</pre>")
    });
}
function set_cmip5_select(variable,query,selectID){
    url="http://data.southcentralclimate.org/api/catalog/data/data_portal/cmip5_files/.json?action=distinct&field=" + variable
    if (query != null){
        url = url + "&query=" + query
    }
    $.getJSON(url,function(data){
        $('#'+ selectID).append($("<option selected disabled></option>").text("Please Select"));
        if(variable=="model"){
            $('#'+ selectID).append($("<option></option>").attr("value","all").text("All Models"));
            all_model = data.sort();
        }
        $.each(data.sort(), function(key, value) {
            $('#'+ selectID)
                .append($("<option></option>")
                .attr("value",value)
                .text(value));
        });
    });
}
function submit_user(){
    console.log(user_url)
    $.post( user_url,$('#user_form').serializeObject(),function(data){
        data.csrftoken = getCookie('csrftoken')
        $('#profile').empty();
        //source = $('#user-template').html()
        //user_template = Handlebars.compile(source);
        user_template = Handlebars.templates['tmpl-user']
        $('#profile').append(user_template(data))
        $('#user_form').hide()
        $('#view_form').show()
        $('#reset_password').click(function(){$('#pass_form').toggle(!$('#pass_form').is(':visible'));});
    })
    .fail(function(){ alert("Error Occured on User Update.")});
    //$('#user_form').hide()
    //$('#view_form').show()
    //var formData = JSON.parse($("#user_form").serializeArray());
    //console.log(formData);
    return false;
}
function edit_user(){
    $('#user_form').show()
    $('#view_form').hide()
    return false;
}
function set_password(){
    pass = $('#pass_form').serializeObject()
    if (pass.password !== pass.password2){
        alert("Passwords were not identical.")
        return false;

    }
    $.post( user_url,$('#pass_form').serializeObject(),function(data){
        $('#reset_password').click(function(){$('#pass_form').toggle(!$('#pass_form').is(':visible'));});
        alert(JSON.stringify(data))
    })
    .fail(function(){ alert("Error Occured on Password Reset.")});
    return false;
}
function set_auth(base_url,login_url){
    $.getJSON( base_url + "/user/.json",function(data){
        $('#user').html(data['username'].concat( ' <span class="caret"></span> '));
        $("#user").append($('<img style="border-radius:80px;">').attr("src",data['gravator_url'] + "?s=40&d=mm") );
        data.csrftoken = getCookie('csrftoken')
        //source = $('#user-template').html()
        //user_template = Handlebars.compile(source);
        user_template = Handlebars.templates['tmpl-user']
        $('#profile').append(user_template(data))
        $('#user_form').hide()
        $('#view_form').show() 
        $('#reset_password').click(function(){$('#pass_form').toggle(!$('#pass_form').is(':visible'));});
    })
    .fail(function() {
        var slink = login_url.concat(document.URL);
        window.location = slink
    });
}
function activaTab(tab){
    $('a[href="#' + tab + '"]').tab('show')
};
function load_task_history(url){
    $.getJSON(url, function(data){
    prevlink = data.previous;
    nextlink = data.next;
    if (prevlink == null){$('#li_prevlink').addClass("disabled");} else {$('#li_prevlink').removeClass("disabled");};
    if (nextlink == null){$('#li_nextlink').addClass("disabled");} else {$('#li_nextlink').removeClass("disabled");};
    setTaskDisplay(data);
    //source = $('#tr-template').html();
    //tr_template = Handlebars.compile(source);
    tr_template = Handlebars.templates['tmpl-tr']
    $('#result_tbody').html("")//clear table
    $.each(data.results, function(i, item) {
        temp=item.task_name.split('.')
        item['task_name']= temp[temp.length-1]
        item.timestamp = item.timestamp.substring(0,19).replace('T',' ')
        $('#result_tbody').append(tr_template(item)) 
    });
    });
}
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
        }   
        $('#task_count').text('Task ' + rec_start + ' - ' + rec_end  +  ' Total ' + data.count )
    }

}
function showResult(url){
    //myModalLabel -->title
    $.getJSON(url + ".json" , function(data){
        json_data = JSON.stringify(data,null, 4);
        $("#myModalbody").html(json_data);
        $("#myModalbody").urlize();
        $("#myModal").modal('show');
    });
}
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
        }
    }
    return cookieValue;
}
