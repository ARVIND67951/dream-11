function platformArchitecture(){
    var navigatorBox = navigator;
    if(navigatorBox===undefined || navigatorBox===null || navigatorBox===''){
        return '';
    }else{
        return navigatorBox.platform;
    }
}