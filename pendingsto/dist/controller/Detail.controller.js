sap.ui.define(["./BaseController","sap/ui/model/json/JSONModel","../model/formatter","sap/m/library","jquery.sap.global","sap/m/MessageStrip","../model/ODataHelper"],function(e,t,r,a,s,i,n){"use strict";var o=new i;var l;var u;var f;var g;var d;var h=false;var c=false;var m=a.URLHelper;return e.extend("wos.zint.pendingsto.controller.Detail",{formatter:r,onInit:function(){var e=this.byId("iconTabBarFilter2").getId();var r=new t({Ebeln:"",Reswk:"",Werks:"",Unsez:"",Ihrez:"",Name1:"",Lgort:"",ParcelRef:"",Bsart:"",STOItemSet:[],busy:false,delay:0,lineItemListTitle:this.getResourceBundle().getText("detailLineItemTableHeadingCount")});this.aCertSerData={Items:[]};this.refNumInfoCapModel=new sap.ui.model.json.JSONModel(this.aCertSerData);this.getView().setModel(this.refNumInfoCapModel,"refNumInfoCapModel");this.refNumSetModel=new sap.ui.model.json.JSONModel;sap.ui.getCore().setModel(this.refNumSetModel,"refNumSet");this.refNumSaveModel=new sap.ui.model.json.JSONModel;sap.ui.getCore().setModel(this.refNumSaveModel,"refNumSave");var a=this.getView();sap.ui.getCore().getMessageManager().registerObject(a,true);var s=new t({Ebeln:"",Reswk:"",Werks:"",Unsez:"",Ihrez:"",Name1:"",Lgort:"",ParcelRef:"",Bsart:"",STOItemSet:[],busy:false,delay:0,lineItemListTitle:this.getResourceBundle().getText("detailLineItemTableHeadingCount")});this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched,this);this.setModel(s,"detailView");this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));sap.ui.getCore().byId(e).setProperty("visible",false);var i=new sap.ui.model.json.JSONModel({isOdataDone:true,butTabRow:"",homeStore:"",salesOrg:"",stoCurr:"",totSendQuantity:0,totSendNetRetail:0,currSTONumPath:""});this.getView().setModel(i,"globalData");var n=function(e){i.setProperty("/homeStore",e.results[0].Werks);s.setProperty("/Reswk",e.results[0].Werks);i.setProperty("/salesOrg",e.results[0].SalesOrg);i.setProperty("/stoCurr",e.results[0].Curr)};var o=function(e){console.log(e);console.log(e.responseText);console.log(e.message)};var l=this.getOwnerComponent().getModel();var u={};u.success=n;u.error=o;u.async=false;var f="/GetHomeStoreSet";l.read(f,u)},onRefButtonPress:function(e){var t;var r=e.getSource().getParent();var a=r.getBindingContext("detailView");var s=a.getProperty("Matnr");var i=this.getView().getModel("detailView");var n;var o;var l=i.getProperty("/Reswk");var u=i.getProperty("/Werks");var h=l;var c=this.getView().getModel("globalData");c.setProperty("/butTabRow",r);n=a.getProperty("MerchCat");if(n==="1730"||n==="1777"){f=true}else{f=false}t=this;if(g===true){o=d;t.getSerialCerts(o,s,l);g=false;d=0}else{t.getRefDocs(h,s,l,u,a)}},getRefDocs:function(e,t,r,a,s){var i=[];var n=this.getView().getModel();var o=this.getView().getModel("globalData");var l;var u;var f=this;l=o.getProperty("/salesOrg");i=new sap.ui.model.Filter({filters:[new sap.ui.model.Filter({filters:[new sap.ui.model.Filter("Werks",sap.ui.model.FilterOperator.EQ,r),new sap.ui.model.Filter("Werks",sap.ui.model.FilterOperator.EQ,a)],and:false}),new sap.ui.model.Filter({filters:[new sap.ui.model.Filter("Vkorg",sap.ui.model.FilterOperator.EQ,l),new sap.ui.model.Filter("Vkorg",sap.ui.model.FilterOperator.EQ,l)],and:false}),new sap.ui.model.Filter({filters:[new sap.ui.model.Filter("Matnr",sap.ui.model.FilterOperator.EQ,t),new sap.ui.model.Filter("Fldcount",sap.ui.model.FilterOperator.EQ,"1")],and:true})],and:true});var g={1:{order:1,text:f.getResourceBundle().getText("CreateNewRef")},2:{order:2,text:f.getResourceBundle().getText("STOStores")},3:{order:2,text:f.getResourceBundle().getText("OtherLoc")}};var d=function(e){return e===""?"1":e===r||e===a?"2":"3"};var h=function(e){var t=e.getProperty("Werks");var r=d(t);return{key:r,text:g[r].text}};u=new sap.ui.model.Sorter("Werks",null,h);n.read("/RefNumSet",{filters:[i],success:function(e,t){var r=sap.ui.getCore().getModel("refNumSet");r.setData(e);r.refresh(true);f.setPrevSelectedRefs(r,s);r.refresh(true);if(!a){var a=sap.ui.xmlfragment("wos.zint.pendingsto.fragments.RefNumAllocate",f);a.setModel(r)}f.getView().addDependent(a);a.setGrowingThreshold(1e3);a.getBinding("items").sort(u);a.open();var i=a._oSearchField.getId();var n=sap.ui.getCore().byId(i);jQuery.sap.delayedCall(300,null,function(){n.focus()})},error:function(e,t,r){}})},setPrevSelectedRefs:function(e,t){var r=e.getData();var a;a=t.getProperty("Refnrs");if(typeof a!=="undefined"&&a!=="_"){var s=new Array;var i;s.length=0;if(a.length!==0){a=a.replace(/\s+/g,"");s=a.split(",")}if(parseInt(t.getProperty("Menge"),10)>=s.length){for(var n=0;n<r.results.length;n++){i=s.indexOf(r.results[n].Refnr);if(i>=0&&typeof i!=="undefined"){r.results[n].selected=true;e.setData(r)}}}}},_RefSearch:function(e){var t=e.getParameter("value");t.toUpperCase();var r=[new sap.ui.model.Filter("Refnr",sap.ui.model.FilterOperator.Contains,t),new sap.ui.model.Filter("Data",sap.ui.model.FilterOperator.Contains,t)];var a=new sap.ui.model.Filter(r,false);var s=[];s.push(a);e.getSource().getBinding("items").filter(s);if(e.getSource().getItems().length===0){s=[];r=[new sap.ui.model.Filter("Refnr",sap.ui.model.FilterOperator.Contains,"0000000000"),new sap.ui.model.Filter("Data",sap.ui.model.FilterOperator.Contains,"0000000000")];a=new sap.ui.model.Filter(r,false);s.push(a);e.getSource().getBinding("items").filter(s)}},_RefClose:function(e){var t=this.getView().getModel("globalData");var r=this.getView().getModel("detailView");var a=t.getProperty("/butTabRow");var s=a.getBindingContext("detailView");var i=e.getParameter("selectedContexts");var n;var o;var l;var u;var f;u=s.getProperty("Menge");f=parseInt(Math.abs(u),10);this.createRefFlg=false;d=0;var h=this;n=i.map(function(e){if(e.getObject().Refnr==="0000000000"){g=true}else{return e.getObject().Refnr}}).join(", ");if(g===true){d=f-i.length+1}if(n.charAt(0)===","){n=n.substring(2)}if(n.charAt(n.length-2)===","){n=n.substr(0,n.length-2)}o=n.replace(", , ",", ");n=o;l=i.map(function(e){if(e.getObject().Refnr!=="0000000000"){return e.getObject().Data}}).join(", ");if(l.charAt(0)===","){l=l.substring(2)}if(l.charAt(l.length-2)===","){l=l.substr(0,l.length-2)}o=l.replace(", , ",", ");l=o;r.setProperty(s+"/RefDocsReq","true");if(g===false&&i&&(i.length!==f&&f!==0)){sap.m.MessageBox.error(this.getResourceBundle().getText("ChooseRef",[f]),{title:this.getResourceBundle().getText("SpecifyAllreferences"),onClose:null,styleClass:"",initialFocus:null,textDirection:sap.ui.core.TextDirection.Inherit})}if(i.length===0){r.setProperty(s+"/Refnrs","_");r.setProperty(s+"/IdentData","_")}if(g===true){if(i&&i.length-1+d===f){sap.ui.getCore().byId(a.getCells()[3].getId()).firePress()}else{if(i&&i.length>f){g=false;sap.m.MessageBox.error(this.getResourceBundle().getText("RefSelectedDeselectCreateNew",[f]),{title:this.getResourceBundle().getText("TooManyRef"),onClose:null,styleClass:"",initialFocus:null,textDirection:sap.ui.core.TextDirection.Inherit})}}}r.setProperty(s+"/Refnrs",n);r.setProperty(s+"/IdentData",l);r.refresh(true);if(this.oDialog){this.oDialog.destroy()}},_RefCancel:function(e){if(this.oDialog){this.oDialog.destroy()}},getSerialCerts:function(e,t,r){var a=this.getView();var s;var i=this.getView().getModel("refNumInfoCapModel");var n=[];var o=parseInt(Math.abs(e),10);i.setData(this.aCertSerData);this.aCertSerData.Items.length=0;for(var l=0;l<o;l++){n={store:r,itemNum:l+1,article:t,identNum:"",refNum:"",gotRef:"NA",serialSubmittedFlg:false,needRef:false,itemStatus:"",confQueriedRefNumCreation:""};this.aCertSerData.Items.push(n)}i.setData(this.aCertSerData);if(!s){s=sap.ui.xmlfragment(a.getId(),"wos.zint.pendingsto.fragments.EnterCertSerial",this);a.addDependent(s);s.open()}},dCertSerAfterOpen:function(e){var t=this.getView().byId("tCertSer");var r=t.getItems();var a=r[0];this.findInputField(a).focus()},dCertSerAfterClose:function(e){e.getSource().destroy()},onCertSerDialogBack:function(e){var t=e.getSource().getParent();t.close()},onCertSerMore:function(e){var t=this.getView().getModel("refNumInfoCapModel");var r=this.getView().byId("tCertSer");var a=r.getItems();var s=e.oSource.getBindingContext("refNumInfoCapModel");var i=parseInt(s.sPath.substring(s.sPath.lastIndexOf("/")+1),10);var n=e.getSource().getParent();var o;n.setSelected(true);var l={store:t.getProperty(s+"/store"),itemNum:t.getProperty(s+"/itemNum"),article:t.getProperty(s+"/article"),identNum:"",refNum:"",message:"",gotRef:"NA",serialSubmittedFlg:false,needRef:false,itemStatus:"",confQueriedRefNumCreation:""};sap.m.MessageBox.warning(u.getText("msgAddAnotherCertLong"),{icon:sap.m.MessageBox.Icon.WARNING,title:u.getText("msgAddAnotherCertShort"),actions:[sap.m.MessageBox.Action.YES,sap.m.MessageBox.Action.NO],initialFocus:sap.m.MessageBox.Action.NO,onClose:function(e){if(e===sap.m.MessageBox.Action.NO){return}else{this.aCertSerData.Items.splice(i+1,0,l);t.refresh(true);o=a[i+1];this.findInputField(o).focus()}}.bind(this)})},identNumAfterChange:function(e){var t=this.getView().getModel("refNumInfoCapModel");var r=this.getView().byId("tCertSer");var a=r.getItems();var s=a.length;var i=s-1;var n=e.oSource.getBindingContext("refNumInfoCapModel");var o=parseInt(n.sPath.substring(n.sPath.lastIndexOf("/")+1),10);var l;var u=o;var f;var g="";var d=3;var h=false;var c=this.getView().byId("butCertSerConf");f=e.getSource().getValue().toUpperCase().trim();e.getSource().setValue(f);t.setProperty(n+"/needRef","");t.setProperty(n+"/confQueriedRefNumCreation","");t.setProperty(n+"/message","");t.refresh(true);if(e.getSource().getValue()===""){return}for(l=o;l<=i;l++){g=a[l].getCells()[d].getValue();if(g===""){h=true;u=l;a[u].getCells()[d].focus();break}}if(h===false){for(l=0;l<=o;l++){g=a[l].getCells()[d].getValue();if(g===""){h=true;u=l;a[u].getCells()[d].focus();break}}}if(h===false){c.firePress()}},onCertSerDialogConf:function(e){var t;var r;var a=this.byId("tCertSer");var s=a.getItems();var i=a.getModel("refNumInfoCapModel");var n;var o;var l;var u;var g;var d;var h;var c=[];var m=[];var p=[];var v;this.aCertSerData.Items.sort(function(e,t){return t.identNum-e.identNum});this.aCertSerData.Items.sort(function(e,t){return e.itemNum-t.itemNum});t=this.aCertSerData.Items.length;r="";for(var S=0;S<t;S++){if(this.aCertSerData.Items[S].itemNum===r&&this.aCertSerData.Items[S].identNum===""){r=this.aCertSerData.Items[S].itemNum;this.aCertSerData.Items.splice(S,1);t=this.aCertSerData.Items.length;S--}else{r=this.aCertSerData.Items[S].itemNum}}this.aCertSerData.Items.sort(function(e,t){return e.identNum-t.identNum});this.aCertSerData.Items.sort(function(e,t){return e.itemNum-t.itemNum});for(var C=0;C<t;C++){c.push(this.aCertSerData.Items[C].identNum)}if(this.checkIfArrayHasDuplicates(c)){for(S=0;S<t;S++){o=s[S];this.aCertSerData.Items[S].gotRef=false}i.refresh();var I=new sap.m.Dialog({title:this.getResourceBundle().getText("DuplicatesNotPermittedTitle"),type:sap.m.DialogType.Confirm,content:new sap.m.Text({text:this.getResourceBundle().getText("DuplicatesNotPermitted")}),beginButton:new sap.m.Button({text:this.getResourceBundle().getText("OK"),press:function(){I.close()}})});I.open();return}else{for(S=0;S<t;S++){o=s[S];if(this.aCertSerData.Items[S].confQueriedRefNumCreation==="false"){this.aCertSerData.Items[S].confQueriedRefNumCreation="true"}}i.refresh()}for(var C=0;C<t;C++){c.push(this.aCertSerData.Items[C].identNum)}var y=[[]];var R=[[]];s=a.getItems();n=s.length;y.length=0;r="1";h=0;i.refresh();var b={item:"",certSer:""};i.refresh();for(var S=0;S<n;S++){o=s[S];l=i.oData.Items[S].itemNum;g=i.oData.Items[S].store;u=i.oData.Items[S].article;d=i.oData.Items[S].identNum;b={item:l,certSer:d};p.push(b);if(d===""){this.aCertSerData.Items[S].message="";this.aCertSerData.Items[S].gotRef="NA";this.aCertSerData.Items[S].confQueriedRefNumCreation="";this.aCertSerData.Items[S].serialSubmittedFlg=false;this.aCertSerData.Items[S].needRef=false}r=l}r="0";h=0;R.length=0;for(var S=0;S<n;S++){o=s[S];l=i.oData.Items[S].itemNum;if(l!==r){h=S}if(l!==r){if(i.oData.Items[S].confQueriedRefNumCreation==="true"){v="I"}else{v="E"}m.length=0;for(var C=0;C<p.length;C++){if(p[C].item===l){m.push(p[C].certSer)}}y[h]=this.SubmitRefNumInfo(this.refNumInfoCapModel,h,o,u,g,v,m,f);r=l;m=[]}else{if(S===h){this.updateCreateRefNumResultToScreen(S,"NoSub","","")}else{this.updateCreateRefNumResultToScreen(S,"RepRow","","")}r=l}g=i.oData.Items[S].store;u=i.oData.Items[S].article;d=i.oData.Items[S].identNum}},checkIfArrayHasDuplicates:function(e){for(var t=0;t<e.length;t++){if(e[t]===""){return true}for(var r=t;r<e.length;r++){if(t!=r){if(e[t]==e[r]){return true}}}}return false},MakeExtraCertSerArrayLine:function(e){var t=[];t.push(e[0]);t.push(e[1]);t.push("RepRow");t.push(e[3]);return t},SubmitRefNumInfo:function(e,t,r,a,s,i,n,o){var l=[];var u=this;var f=function(e,t){var r=e.RefNum;var a=e.Message;var s=a;u.updateCreateRefNumResultToScreen(e.CallerLink,"SubOK",s,r);l.push(r);l.push(a);l.push("SubOK");l.push(s);return l};var g=function(e){var t=JSON.parse(e.responseText).error.innererror.errordetails;var r;var a;var s="";var i;for(var n=0;n<t.length;n++){if(t[n].code==="/IWBEP/CX_MGW_BUSI_EXCEPTION"||t[n].code==="Z_POS/127"&&o==="true"){t.splice(n,1)}}for(var n=0;n<t.length;n++){if(t[n].code==="Z_POS/171"){i=t[n].message;t.splice(n,1)}}for(var n=0;n<t.length;n++){if(t[n].code==="Z_POS/128"){t.splice(n,1)}}for(var n=0;n<t.length;n++){a=t[n].message;if(t[n].code==="Z_POS/111"){a=u.getResourceBundle().getText("Serial/GIA/CertAlreadyAssigned")}if(t[n].code==="Z_POS/127"){if(o===true){a=u.getResourceBundle().getText("SerialNumNotInRefTable")}else{a=u.getResourceBundle().getText("ReferenceToBeCreated")}}if(t[n].code==="Z_POS/106"){if(o===true){a=t[n].message+". "}}if(t[n].code==="Z_POS/107"||t[n].code==="Z_POS/141"){if(o===true){a=u.getResourceBundle().getText("EmailMerchEnq")}}if(t[n].code==="Z_POS/130"){a=u.getResourceBundle().getText("CollectPrintedLabel")}if(t[n].code==="Z_POS/095"){a=u.getResourceBundle().getText("RefInProcessByAnotherUser")}if(t[n].code==="Z_POS/172"){a=u.getResourceBundle().getText("CheckSerialNum")}if(n===0){r=a}else{r=r+a}if(t[n].code==="Z_POS/111"||t[n].code==="Z_POS/113"||t[n].code==="Z_POS/105"||t[n].code==="Z_POS/106"||t[n].code==="Z_POS/126"||t[n].code==="Z_POS/095"||t[n].code==="Z_POS/172"||t[n].code==="Z_POS/127"&&o===true){s="SubErrsRej"}if(s===""){s="SubErrs"}}u.updateCreateRefNumResultToScreen(i,s,r);l.push("");l.push(t);l.push(s);l.push(r);return l};if(n.length===0){l.push("");l.push("");l.push("NoSub");l.push("");return l}var d={};d.success=f;d.error=g;d.async=false;var h=[];for(var c=0;c<n.length;c++){var m={ArticleCounter:1,ItemCounter:c+1,Data:n[c]};h.push(m)}var p={ArticleCounter:1,RefNum:"",Werks:s,Matnr:a,ExternalFlag:i,DataFlag:"D",SkipRefTran:"X",SkipRefStoreTran:"X",Message:"",PrintLabel:"X",CallerLink:t,RefNumPostItemSet:h};var v=this.getView().getModel("refCaptureOdata");v.create("/RefNumPostHeadSet",p,d);return l},updateCreateRefNumResultToScreen:function(e,t,r,a){var s=this.getView().getModel("refNumInfoCapModel");var i;var n;var o;var l;var u;var f=this.aCertSerData.Items.length;var g;var d;var h;var c;var m;var p=this.getView().getModel("detailView");var v=this.getView().getModel("globalData");var S=v.getProperty("/butTabRow");var C=S.getBindingContext("detailView");var I=p.getProperty(C+"/Refnrs");var y=p.getProperty(C+"/IdentData");var R=new Array;var b=new Array;this.aCertSerData.Items[e].message=r;this.aCertSerData.Items[e].refNum=a;this.aCertSerData.Items[e].serialSubmittedFlg=true;if(t==="SubOK"){this.aCertSerData.Items[e].needRef=false;this.aCertSerData.Items[e].gotRef=true;this.aCertSerData.Items[e].confQueriedRefNumCreation=""}if(t==="SubErrs"){this.aCertSerData.Items[e].needRef=true;this.aCertSerData.Items[e].gotRef=false;this.aCertSerData.Items[e].message=r+this.getResourceBundle().getText("AcceptNewRef");this.aCertSerData.Items[e].confQueriedRefNumCreation="false"}if(t==="SubErrsRej"){this.aCertSerData.Items[e].needRef=true;this.aCertSerData.Items[e].gotRef=false;this.aCertSerData.Items[e].message=r+" "+this.getResourceBundle().getText("STOCannotBePostedInvalidSerialNum");this.aCertSerData.Items[e].confQueriedRefNumCreation=""}if(t==="RepRow"){this.aCertSerData.Items[e].needRef=false;this.aCertSerData.Items[e].gotRef=true}if(t==="NoSub"){}n=0;o=true;for(var w=0;w<f;w++){g=this.aCertSerData.Items[w];i=g.itemNum;if(i!==n&&g.serialSubmittedFlg===false){o=false;u=false}}if(o===true){u=true;h="";m="";if(typeof I!=="undefined"){R.length=0;if(I.length!==0){I=I.replace(/\s+/g,"");R=I.split(",")}}if(typeof y!=="undefined"){b.length=0;if(y.length!==0){y=y.replace(/\s+/g,"");b=y.split(",")}}h=I;m=y;for(var w=0;w<f;w++){g=this.aCertSerData.Items[w];l=true;d="";c="";if(g.gotRef===true){l=true;d=this.aCertSerData.Items[w].refNum;c=this.aCertSerData.Items[w].identNum}if(g.needRef===true&&g.gotRef!==true){l=false;for(var P=0;P<f;P++){if(this.aCertSerData.Items[P].itemNum===g.itemNum&&this.aCertSerData.Items[P].needRef==true&&this.aCertSerData.Items[P].gotRef===true){l=true;d=this.aCertSerData.Items[P].refNum;c=this.aCertSerData.Items[w].identNum}}if(l===false){u=false;break}}if(l===true&&d!==""){if(R.includes(d)===false){if(h===""){h=d}else{h=h+", "+d}}if(b.includes(c)===false){if(m===""){m=c}else{m=m+", "+c}}}}s.refresh();if(o===true&&u===true){this.getView().byId("butCertSerBack").setText(this.getResourceBundle().getText("closeColumn"));this.getView().byId("butCertSerConf").setVisible(false);p.setProperty(C+"/Refnrs",h);p.setProperty(C+"/IdentData",m);p.refresh(true)}else{this.getView().byId("butCertSerBack").setText(this.getResourceBundle().getText("Back"));this.getView().byId("butCertSerConf").setVisible(true)}}},getItemsTable:function(){return this.byId("items")},displayPdf:function(e){var t="/sap/opu/odata/sap/ZINT_PEX_GOODSISSUE_SRV/pdfSet(Ebeln='"+e+"')"+"/$value";l=this.getView().byId("pdfContainer");var r='<iframe src="'+t+'" embedded="true" style="width:100%; height:100%;" frameborder="0"></iframe>';l.setContent(r)},onPressClosePdf:function(){var e="";l.setContent(e);var t=this.byId("btnClose").getId();sap.ui.getCore().byId(t).setProperty("visible",false)},handleIconTabBarSelect:function(e){var t=e.getParameter("key");var r=this;var a=this.getView();var s;var i;if(t.indexOf("iconTabBarFilter2")!==-1){s=a.getElementBinding().getPath();i=a.getModel().getObject(s);r.displayPdf(i.Ebeln);var n=r.byId("btnClose").getId();sap.ui.getCore().byId(n).setProperty("visible",true)}},onSendEmailPress:function(){var e=this.getModel("detailView");m.triggerEmail(null,e.getProperty("/shareSendEmailSubject"),e.getProperty("/shareSendEmailMessage"))},onListUpdateFinished:function(e){var t,r=e.getParameter("total"),a=this.getModel("detailView"),s=this.byId("btnPost").getId(),i=this.byId("iconTabBarFilter2").getId();if(this.byId("lineItemsList").getBinding("items").isLengthFinal()){if(r){t=this.getResourceBundle().getText("detailLineItemTableHeadingCount",[r])}else{t=this.getResourceBundle().getText("detailLineItemTableHeading")}a.setProperty("/lineItemListTitle",t);sap.ui.getCore().byId(i).setProperty("visible",false)}},_onObjectMatched:function(e){var t=e.getParameter("arguments").objectId;var r=this;this.getModel("appView").setProperty("/layout","TwoColumnsMidExpanded");this.getModel().metadataLoaded().then(function(){var e=this.getModel().createKey("STOHeaderSet",{Ebeln:t});this._bindView("/"+e)}.bind(this));this.getModel().metadataLoaded().then(function(){var e=r.getModel().createKey("STOHeaderSet",{Ebeln:t});r.getModel().read("/"+e,{urlParameters:{$expand:"STOItemSet"},success:function(e,t){r.getModel("detailView").setData(e)}.bind(this),error:function(e,t,r){console.log("Error!!")}.bind(this)})})},_bindView:function(e){var t=this.getModel("detailView");t.setProperty("/busy",false);this.getView().bindElement({path:e,events:{change:this._onBindingChange.bind(this),dataRequested:function(){t.setProperty("/busy",true)},dataReceived:function(){t.setProperty("/busy",false)}}})},_onBindingChange:function(){var e=this.getView(),t=e.getElementBinding();if(!t.getBoundContext()){this.getRouter().getTargets().display("detailObjectNotFound");this.getOwnerComponent().oListSelector.clearMasterListSelection();return}var r=t.getPath(),a=this.getResourceBundle(),s=e.getModel().getObject(r),i=s.Ebeln,n=s.Ebeln,o=this.getModel("detailView");this.getOwnerComponent().oListSelector.selectAListItem(r);o.setProperty("/shareSendEmailSubject",a.getText("shareSendEmailObjectSubject",[i]));o.setProperty("/shareSendEmailMessage",a.getText("shareSendEmailObjectMessage",[n,i,location.href]))},onChangeParcelRef:function(e){var t=this.getView().byId("page");var r=e.getParameters();var a=r.id;var s=r.value;var n=this.byId("btnPost").getId();var l=this.getView().byId(n);var f=u.getText("msgParcelRefError");if(this.validateParcelRef(s)){sap.ui.getCore().byId(a).setValueState(sap.ui.core.ValueStateNone);var g=t.getContent();for(var d=0;d<g.length;d++){if(g[d].sId.indexOf("strip")!==-1&&g[d].getText()===f){t.removeContent(g[d].sId)}}l.setEnabled(true)}else{o=new i({text:f,showIcon:true,showCloseButton:true,type:"Error"});t.addContent(o);sap.ui.getCore().byId(a).setValueState(sap.ui.core.ValueState.Error);sap.ui.getCore().byId(a).setValueStateText(f);l.setEnabled(false)}},onSavePress:function(){var e=this.getView().getModel();var t=this.getView();var r=this.getView().getModel("detailView");var a=r.getProperty("/Ebeln");var s=sap.ui.getCore().byId("parcelRefId");var n=r.getProperty("/ParcelRef");var l=this.byId("btnPost").getId();var f=this.getView().byId(l);var g=this;if(!this.validateParcelRef(n)){var d=u.getText("msgParcelRefError");sap.ui.getCore().byId(s).setValueState(sap.ui.core.ValueState.Error);sap.ui.getCore().byId(s).setValueStateText(d);f.setEnabled(false);o=new i({text:d,showIcon:true,showCloseButton:true,type:"Error"});t.addContent(o);return}if(!this.validateArtRefs()){return}},validateParcelRef:function(e){if(e.length<=16&&e!==""){return true}else{return false}},validateArtRefs:function(){var e=this.getView().getModel("detailView");var t=e.getData();var r=t.STOItemSet.results;var a=new Array;var s;var i;h=false;a=this.checkRefNums();s=a[0];i=a[1];if(s===false){if(i===true){this.doPost()}else{h=true;this.addMessageStrip("{i18n>msgFixBeforeSave}","Error",true,true)}}else{if(i===true){this.saveRefNumsToReceivingStore(r,t.Werks)}else{h=true;this.addMessageStrip("{i18n>msgFixBeforeSave}","Error",true,true)}}},checkRefNums:function(){c=false;var e=this.getView().getModel("detailView");var t=e.getData();var r=t.STOItemSet.results;var a=false;var s=true;var i=new Array;var n=new Array;var o=false;var l;var u;n.length=0;for(var f=0;f<r.length;f++){if(r[f].Refnrs!==""&&typeof r[f].Refnrs!=="undefined"){i=r[f].Refnrs.split(",");for(var g=0;g<i.length;g++){i[g].trim()}a=true}else{i=[]}if(r[f].CertFlg!=="X"&&r[f].MerchCat!=="1730"&&r[f].MerchCat!=="1777"||t.Bsart!=="ZCTO"){continue}l=r[f].Menge;u=parseInt(Math.abs(l),10);if(u===0){continue}if(u!==i.length&&u!==0){sap.m.MessageBox.error(this.getResourceBundle().getText("EnterRefForArticle",[r[f].Matnr]),{title:this.getResourceBundle().getText("SelectRef"),onClose:null,styleClass:"",initialFocus:null,textDirection:sap.ui.core.TextDirection.Inherit});s=false}if(s===true){n=this.getProductsWithRefNumClash(r);if(n.length>0){o=true;sap.m.MessageBox.error(this.getResourceBundle().getText("DuplicateRefError",[n[0]]),{title:this.getResourceBundle().getText("DuplicateReference"),onClose:null,styleClass:"",initialFocus:null,textDirection:sap.ui.core.TextDirection.Inherit})}}}if(a===false){if(s===false||o===true){return[false,false]}else{return[false,true]}}if(s===false||o===true){return[true,false]}else{return[true,true]}},getProductsWithRefNumClash:function(e){var t=[];var r=[];var a;var s=[];a=false;s.length=0;for(var i=0;i<e.length;i++){if(e[i].Refnrs!==""&&typeof e[i].Refnrs!=="undefined"){r.length=0;for(var n=0;n<e.length;n++){t.length=0;if(e[n].Matnr===e[i].Matnr){if(e[n].Refnrs!==""&&typeof e[n].Refnrs!=="undefined"){t=e[n].Refnrs.split(",")}for(var o=0;o<t.length;o++){r.push(t[o].trim())}}}a=this.chkArrayDuplicates(r,true);if(a){s.push(e[i].Matnr)}}}return s},chkArrayDuplicates:function(e,t){var r=e.length,a={},s=e.slice(),i=[];s.sort();while(r--){var n=s[r];if(n==="No Reference #"){continue}if(/nul|nan|infini/i.test(String(n))){n=String(n)}if(a[JSON.stringify(n)]){if(t){return true}i.push(n)}a[JSON.stringify(n)]=true}return t?false:i.length?i:null},saveRefNumsToReceivingStore:function(e,t){var r=this.getView().getModel("refNumSave");var a=[];var s={};var i;var o;var l;var u=new Array;var f=this;c=false;for(var g=0;g<e.length;g++){o=e[g].Menge;l=parseInt(Math.abs(o),10);if(e[g].Refnrs!==""&&e[g].Refnrs!=="_"&&typeof e[g].Refnrs!=="undefined"){i=e[g].Refnrs.trim()}else{i=""}a.length=0;if(i!==""&&typeof i!=="undefined"){a=i.split(",")}if(a.length!==0&&a.length===l){for(var d=0;d<a.length;d++){if(a[d].trim()!=="No Reference #"){var h=[];var m={ArticleCounter:1,ItemCounter:1,Data:a[d].trim()};h.push(m);s={ArticleCounter:1,RefNum:"",Werks:t,Matnr:e[g].Matnr,ExternalFlag:"E",DataFlag:"N",SkipRefTran:"",SkipRefStoreTran:"",Message:"",PrintLabel:"",RefNumPostItemSet:h};u.push(n.callCREATEOData(r,"/RefNumPostHeadSet",s).then(function(e){if(e.Matnr===""){c=true}}).catch(function(e){c=true}))}}}}f=this;Promise.all(u).then(f.handleRefNumSaveOutcome.bind(f))},handleRefNumSaveOutcome:function(e){var t=this.getView().getModel("detailView");var r=t.getData();if(c===true){sap.m.MessageBox.error(this.getResourceBundle().getText("AssignArticleError",[r.Werks]),{title:this.getResourceBundle().getText("ProblemMovingArticleRef"),onClose:null,styleClass:"",initialFocus:null,textDirection:sap.ui.core.TextDirection.Inherit})}else{this.doPost()}},doPost:function(){var e=this;var t=this.getView();var r=this.getView().getModel();var a=this.getView().getModel("detailView");var s=a.getData();var n=a.getProperty("/Ebeln");var l=a.getProperty("/ParcelRef");this.busyDialog=new sap.m.BusyDialog;this.busyDialog.open();var u=[];for(var f=0;f<s.STOItemSet.results.length;f++){var g={Ebeln:"",Ebelp:"",Matnr:"",Refnrs:"",IdentData:""};g.Ebeln=n;g.Ebelp=s.STOItemSet.results[f].Ebelp;g.Matnr=s.STOItemSet.results[f].Matnr;g.Refnrs=s.STOItemSet.results[f].Refnrs;g.IdentData=s.STOItemSet.results[f].IdentData;u.push(g)}r.create("/GoodsIssHeaderSet",{Ebeln:n,ParcelRef:l,GoodsIssItemSet:u},{method:"POST",success:function(r){e.busyDialog.close();var a=e.getResourceBundle().getText("STOProcessed",[r.Ebeln]);e.displayPdf(r.Ebeln);var s=e.byId("btnClose").getId();var n=e.byId("iconTabBarFilter2").getId();sap.ui.getCore().byId(s).setProperty("visible",true);var l=e.byId("btnPost").getId();sap.ui.getCore().byId(l).setEnabled(false);t=e.getView().byId("page");o=new i({text:a,showIcon:true,showCloseButton:true,type:"Success"});sap.ui.getCore().byId(n).setProperty("visible",true);t.addContent(o);e.getOwnerComponent().oListSelector.clearMasterListSelection();var u=e.getOwnerComponent();var f=u.oListSelector._oList;var g=f.getBinding("items");g.refresh(true)},error:function(r){e.busyDialog.close();var a=JSON.parse(r.responseText).error.innererror.errordetails;var s;var n;var l;var u;var f;var g;t=e.getView().byId("page");for(var d=0;d<a.length;d++){if(a[d].code==="/IWBEP/CX_MGW_BUSI_EXCEPTION"){a.splice(d,1)}}for(var d=0;d<a.length;d++){s=a[d].message;n=a[d].code;if(n==="M7/021"){l=s.search("EA : ");u=l+5;f=s.slice(u);l=f.search(" ");g=f.slice(0,l);s=e.getResourceBundle().getText("giInsufficientStockMsg",[g])}o=new i({text:s,showIcon:true,showCloseButton:true,type:"Error"});t.addContent(o)}o=new i({text:"{i18n>errorInGIMsg}",showIcon:true,showCloseButton:true,type:"Error"});t.addContent(o)}})},findInputField:function(e){var t=jQuery("input",e.getDomRef());if(t.length>0){return jQuery(t[0]).control(0)}else{return null}},addMessageStrip:function(e,t,r,a){var s=this.getView().byId("page");o=new i({text:e,showIcon:a,showCloseButton:r,type:t});s.addContent(o)},_onMetadataLoaded:function(){var e=this.getView().getBusyIndicatorDelay(),t=this.getModel("detailView"),r=this.byId("lineItemsList"),a=r.getBusyIndicatorDelay();t.setProperty("/delay",0);t.setProperty("/lineItemTableDelay",0);r.attachEventOnce("updateFinished",function(){t.setProperty("/lineItemTableDelay",a)});t.setProperty("/busy",true);t.setProperty("/delay",e)},onCloseDetailPress:function(){this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen",false);this.getOwnerComponent().oListSelector.clearMasterListSelection();this.getRouter().navTo("list")},toggleFullScreen:function(){var e=this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen",!e);if(!e){this.getModel("appView").setProperty("/previousLayout",this.getModel("appView").getProperty("/layout"));this.getModel("appView").setProperty("/layout","MidColumnFullScreen")}else{this.getModel("appView").setProperty("/layout",this.getModel("appView").getProperty("/previousLayout"))}}})});