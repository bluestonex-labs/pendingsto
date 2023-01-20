sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/library",
    "jquery.sap.global",
    "sap/m/MessageStrip",
    "../model/ODataHelper"
], function (BaseController, JSONModel, formatter, mobileLibrary, global, MessageStrip, ODataHelper) {
    "use strict";
    var oMSG = new MessageStrip();
    var oContainer;
    var oBundle;
    var brandCheck;
    var createRefFlg;
    var NumOfCreateRefs;
    var isError = false; //General error flag. Something is wrong with the STO setup pior to its submission to SAP 
    var refNumSaveError = false; //Reference number error flag used for determining if all refnums have been specified and also not duplicated when finally pressing the Post PGI for pending STO button.

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend("wos.zint.pendingsto.controller.Detail", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            var btnPDFId = this.byId("iconTabBarFilter2").getId();
            //The chosen values make sure, detail page is busy indication immediately so there is no break in between the busy indication for loading the view's meta data
            var oSTOModel = new JSONModel({
                "Ebeln": "",
                "Reswk": "", //STO Sending store
                "Werks": "", //STO Receiving store
                "Unsez": "", //Our ref / sending ref
                "Ihrez": "", //Your ref / receiving ref
                "Name1": "",
                "Lgort": "",
                "ParcelRef": "",
                "Bsart": "",
                "STOItemSet": [], //name of navigaional propety from header to item set
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeadingCount")
            });

            //Set overall UI view to have a model defined from oSTOModel and named detailView			
            //this.getView().setModel(oSTOModel, "detailView");

            //Array and Model for the table within the dialog window for creation of ref nums via certificate/serial number entry
            //Note: this.xxxxx defination allows xxxxx to be an attribute of this available externally to this function whereas var xxxxx is only not available outside this function. 			
            this.aCertSerData = {
                Items: []
            };
            this.refNumInfoCapModel = new sap.ui.model.json.JSONModel(this.aCertSerData);
            // make the model available
            this.getView().setModel(this.refNumInfoCapModel, "refNumInfoCapModel");

            //Model for reference number search
            this.refNumSetModel = new sap.ui.model.json.JSONModel();
            sap.ui.getCore().setModel(this.refNumSetModel, "refNumSet");

            //Model for reference number save
            this.refNumSaveModel = new sap.ui.model.json.JSONModel();
            sap.ui.getCore().setModel(this.refNumSaveModel, "refNumSave");

            var oView = this.getView();
            //register with message manager
            sap.ui.getCore().getMessageManager().registerObject(oView, true);
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                "Ebeln": "",
                "Reswk": "", //STO Sending store
                "Werks": "", //STO Receiving store
                "Unsez": "", //Our ref / sending ref
                "Ihrez": "", //Your ref / receiving ref
                "Name1": "",
                "Lgort": "",
                "ParcelRef": "",
                "Bsart": "",
                "STOItemSet": [], //name of navigaional propety from header to item set
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeadingCount")
            });

            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

            this.setModel(oViewModel, "detailView");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

            //make PDF button invisible
            sap.ui.getCore().byId(btnPDFId).setProperty("visible", false);

            //Global variable model so some of them can be bound into xml view
            var oGlobalDataModel = new sap.ui.model.json.JSONModel({
                isOdataDone: true,
                butTabRow: "", //butTaRow needed as STO item table context lost when loading ref num allocation fragment. 
                //Not available in refnum cancel or ref num close button processing done. So need to store it here when ref num selection button pressed
                homeStore: "",
                salesOrg: "",
                stoCurr: "",
                totSendQuantity: 0,
                totSendNetRetail: 0.00,
                currSTONumPath: "" //CT
            });

            //Set overall UI view to have a model defined from oGlobalDataModel and named globalData  
            this.getView().setModel(oGlobalDataModel, "globalData");

            //get the home Store of the user
            var homeStoreSuccess = function (oData) {
                oGlobalDataModel.setProperty("/homeStore", oData.results[0].Werks);
                oViewModel.setProperty("/Reswk", oData.results[0].Werks);
                oGlobalDataModel.setProperty("/salesOrg", oData.results[0].SalesOrg);
                oGlobalDataModel.setProperty("/stoCurr", oData.results[0].Curr);
            };
            var homeStoreError = function (oError) {
                console.log(oError);
                console.log(oError.responseText);
                console.log(oError.message);
            };

            var oModel = this.getOwnerComponent().getModel(); //base un-named model
            var params = {};
            params.success = homeStoreSuccess;
            params.error = homeStoreError;
            params.async = false;
            var sService = "/GetHomeStoreSet";
            oModel.read(sService, params);
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */


        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
        //                      									     Press Reference Number BUTTON for an article on STO                                                                   //
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	

        onRefButtonPress: function (oEvent) {
            var that;
            var butTabRow = oEvent.getSource().getParent();
            var butTabRowContext = butTabRow.getBindingContext("detailView");
            //	var butTabRowContext = butTabRow.getBindingContext(); //nameless context as it comes from the matched object router
            var ProductId = butTabRowContext.getProperty("Matnr");
            var tabModel = this.getView().getModel("detailView");
            var merchCat;
            var refsToCreateCnt;
            var sendStore = tabModel.getProperty("/Reswk");
            var receiveStore = tabModel.getProperty("/Werks");
            var filterStore = sendStore;
            var globalDataModel = this.getView().getModel("globalData");

            globalDataModel.setProperty("/butTabRow", butTabRow);
            merchCat = butTabRowContext.getProperty("MerchCat");

            if (merchCat === "1730" || merchCat === "1777") {
                brandCheck = true;
            } else {
                brandCheck = false;
            }

            that = this;

            if (createRefFlg === true) {
                //Creating reference nums
                refsToCreateCnt = NumOfCreateRefs; //only create ref missing number of references 
                //Open reference creation dialogue box. On close that dialog box will fire the press event that will set the createRefFlg to false and then retrigger this onRefButtonPress function to
                //bring up the dialog to get the reference numbers
                that.getSerialCerts(refsToCreateCnt, ProductId, sendStore);
                createRefFlg = false;
                NumOfCreateRefs = 0;
            } else {
                //Not creating reference nums, get ref nums
                that.getRefDocs(filterStore, ProductId, sendStore, receiveStore, butTabRowContext);
            }
        },

        getRefDocs: function (diaFilterStore, diaProductID, mvtSendStore, mvtReceiveStore, butTabRowContext) {
            //Bring up reference numbers for this article (with option to create new)
            var aFilters = [];
            var oModel = this.getView().getModel();
            var globalDataModel = this.getView().getModel("globalData");
            var salesOrg;
            var oSort;
            var that = this;

            //Get sales org required for filter of ref num dialog
            salesOrg = globalDataModel.getProperty("/salesOrg");

            // Need to call ref num dialog fragment in the success function as read of ODATA is async and flow will continue without waiting for 
            // ODATA response so placing dialog call here ensures we have set sales og which filter of ref num dialog requires
            aFilters = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, mvtSendStore),
                            new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, mvtReceiveStore)
                        ],
                        and: false
                    }),

                    new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Vkorg", sap.ui.model.FilterOperator.EQ, salesOrg),
                            new sap.ui.model.Filter("Vkorg", sap.ui.model.FilterOperator.EQ, salesOrg)
                        ],
                        and: false
                    }),

                    new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, diaProductID),
                            new sap.ui.model.Filter("Fldcount", sap.ui.model.FilterOperator.EQ, "1")
                        ],
                        and: true
                    })
                ],
                and: true
            });

            // Sort order and title texts of the 1.STO Sites and 2.Non-STO Sites groups
            var mGroupInfoSTO = {
                1: {
                    order: 1,
                    text: that.getResourceBundle().getText("CreateNewRef")
                },
                2: {
                    order: 2,
                    text: that.getResourceBundle().getText("STOStores")
                    //"STO stores (existing reference - serial number)"
                },
                3: {
                    order: 2,
                    text: that.getResourceBundle().getText("OtherLoc")
                    //"Other locations (existing reference - serial number)"
                }
            };

            // Returns to what group (STO store  or other location) a value belongs
            var fGroupSTO = function (v) {
                return v === "" ? "1" : (v === mvtSendStore || v === mvtReceiveStore) ? "2" : "3";
            };

            // Grouper function for STOs to be supplied as 3rd parm to Sorter
            var fGrouperSTO = function (oContext) {
                var site = oContext.getProperty("Werks");
                var group = fGroupSTO(site);
                return {
                    key: group,
                    text: mGroupInfoSTO[group].text
                };
            };

            // The Sorter, with Grouper function
            oSort = new sap.ui.model.Sorter("Werks", null, fGrouperSTO);

            //read refnums from back end
            oModel.read("/RefNumSet", {
                filters: [aFilters],
                success: function (oData, response) {
                    //save the returned refrence numbers for the article into the refNumModel
                    var refNumModel = sap.ui.getCore().getModel("refNumSet");
                    refNumModel.setData(oData);
                    refNumModel.refresh(true);

                    that.setPrevSelectedRefs(refNumModel, butTabRowContext);
                    refNumModel.refresh(true);

                    if (!oDialog) {
                        var oDialog = sap.ui.xmlfragment("wos.zint.pendingsto.fragments.RefNumAllocate", that);
                        oDialog.setModel(refNumModel);

                    }
                    that.getView().addDependent(oDialog);

                    //Set this suffciently high to stop app re-reading ODATA service and appending duplicate entries to the dialog box)
                    oDialog.setGrowingThreshold(1000);
                    oDialog.getBinding("items").sort(oSort);
                    oDialog.open();
                    //Set focus to search text box
                    var oSearchFieldID = oDialog._oSearchField.getId();
                    var oSearchField = sap.ui.getCore().byId(oSearchFieldID);
                    jQuery.sap.delayedCall(300, null, function () {
                        oSearchField.focus();
                    });
                },
                error: function (oData, response, index) {

                }
            });
        },

        setPrevSelectedRefs: function (refNumModelSelects, butTabRowContext) {
            //Get any previously selected reference numbers for the currently selected item line on the STO items on-screen table
            var refNumSetData = refNumModelSelects.getData();
            var prevRefnrs;

            //If we have previously set ref nums then change the ref num result set to have these refnums as preselected
            prevRefnrs = butTabRowContext.getProperty("Refnrs");
            if (typeof prevRefnrs !== "undefined" && prevRefnrs !== "_") {
                //build array of previously selected ref nums
                var aPrevSelRefNrs = new Array();
                var refFoundIdx;
                aPrevSelRefNrs.length = 0;
                if (prevRefnrs.length !== 0) {
                    //remove spaces from refnums string
                    prevRefnrs = prevRefnrs.replace(/\s+/g, "");
                    aPrevSelRefNrs = prevRefnrs.split(",");
                }

                //only preselect ref nums if new receipt qty >= number of previously selected ref nums
                if (parseInt(butTabRowContext.getProperty("Menge"), 10) >= aPrevSelRefNrs.length) {
                    //If each available ref nums for the article is in the array of previously selected ref nums
                    //then mark it as selected ready for openeing the ref num selection fragment
                    for (var refNrsIdx = 0; refNrsIdx < refNumSetData.results.length; refNrsIdx++) {
                        refFoundIdx = aPrevSelRefNrs.indexOf(refNumSetData.results[refNrsIdx].Refnr);
                        if (refFoundIdx >= 0 && typeof refFoundIdx !== "undefined") {
                            //found current available ref num was a previously selected one so mark it as selected
                            refNumSetData.results[refNrsIdx].selected = true;
                            refNumModelSelects.setData(refNumSetData);
                        }
                    }
                }
            }
        },

        _RefSearch: function (evt) {
            var sValue = evt.getParameter("value");
            sValue.toUpperCase();
            var oFilter1 = [new sap.ui.model.Filter("Refnr", sap.ui.model.FilterOperator.Contains, sValue), new sap.ui.model.Filter("Data", sap
                .ui
                .model.FilterOperator.Contains, sValue)];
            var oFilter = new sap.ui.model.Filter(oFilter1, false);
            var aFilters = [];

            aFilters.push(oFilter);
            evt.getSource().getBinding("items").filter(aFilters);
            if (evt.getSource().getItems().length === 0) {
                //if search through returned references produces no hits then remove teh filter that gives no results and replace with
                //the filter that is for teh create new reference
                aFilters = [];
                oFilter1 = [new sap.ui.model.Filter("Refnr", sap.ui.model.FilterOperator.Contains, "0000000000"), new sap.ui.model.Filter("Data",
                    sap.ui
                        .model.FilterOperator.Contains, "0000000000")];
                oFilter = new sap.ui.model.Filter(oFilter1, false);
                aFilters.push(oFilter);
                evt.getSource().getBinding("items").filter(aFilters);
            }
        },

        _RefClose: function (evt) {
            var globalDataModel = this.getView().getModel("globalData");
            var tabModel = this.getView().getModel("detailView");
            //		var tab = this.byId("items");
            var tabItemRowSelected = globalDataModel.getProperty("/butTabRow");
            var tabItemContext = tabItemRowSelected.getBindingContext("detailView");
            var aContexts = evt.getParameter("selectedContexts");

            var refNrs;
            var tmpStr;
            var identData;
            var sendQty;
            var requiredNumDocRefs;

            sendQty = tabItemContext.getProperty("Menge");

            requiredNumDocRefs = parseInt(Math.abs(sendQty), 10);

            //Store chosen reference numbers, serials and their participating sites in selected table row and also in the controller-level array which holds refnrs and serials which would be
            //otherwise lost when the product table rebinds (e.g. after a filter is applied). The Storing in array allows the values to be restored after the rebinding.
            this.createRefFlg = false;
            NumOfCreateRefs = 0;
            var that = this;

            refNrs = aContexts.map(function (oContext) {
                if (oContext.getObject().Refnr === "0000000000") {
                    createRefFlg = true;
                } else {
                    return oContext.getObject().Refnr;
                }
            }).join(", ");

            if (createRefFlg === true) {
                NumOfCreateRefs = (requiredNumDocRefs - aContexts.length + 1); //+1 is because 0000000000 entry in aContexts is for the create ref selection
            }

            //Get rid of spurious leading and trailing and mid string join ", ". 
            //This could occur anywhere in string as order depends on order user clicked on refnr hit list
            if (refNrs.charAt(0) === ",") {
                refNrs = refNrs.substring(2);

            }
            if (refNrs.charAt(refNrs.length - 2) === ",") {
                refNrs = refNrs.substr(0, refNrs.length - 2);
            }
            tmpStr = refNrs.replace(", , ", ", ");
            refNrs = tmpStr;

            identData = aContexts.map(function (oContext) {
                if (oContext.getObject().Refnr !== "0000000000") {
                    return oContext.getObject().Data;
                }
            }).join(", ");

            //Get rid of spurious leading and trailing and mid string join ", "
            if (identData.charAt(0) === ",") {
                identData = identData.substring(2);

            }
            if (identData.charAt(identData.length - 2) === ",") {
                identData = identData.substr(0, identData.length - 2);
            }
            tmpStr = identData.replace(", , ", ", ");
            identData = tmpStr;

            //Set the flag for if a refnum is required to true to validate docref validation from post all button
            //If this refnum sel button never pressed, will be the initial default of ''
            tabModel.setProperty(tabItemContext + "/RefDocsReq", "true");

            if (createRefFlg === false && aContexts && (aContexts.length !== requiredNumDocRefs && requiredNumDocRefs !== 0)) {
                //Show error message if we are not creating a ref num and the wrong number of reference docs chosen		
                sap.m.MessageBox.error( this.getResourceBundle().getText("ChooseRef", [requiredNumDocRefs]),
                    {
                    title: this.getResourceBundle().getText("SpecifyAllreferences"),
                    onClose: null, // default
                    styleClass: "", // default
                    initialFocus: null, // default
                    textDirection: sap.ui.core.TextDirection.Inherit // default
                });
            }

            if (aContexts.length === 0) {
                tabModel.setProperty(tabItemContext + "/Refnrs", "_");
                tabModel.setProperty(tabItemContext + "/IdentData", "_");

            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //  search refnrs for the 0000000000 create refnr. 
            /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (createRefFlg === true) {
                //if number of selections  + the number of refs left to create(as the create ref option was clisked on)
                // is equal to the required number of references then call teh create serial num/ref screen
                if (aContexts && ((aContexts.length - 1) + NumOfCreateRefs === requiredNumDocRefs)) {
                    //found '0000000000' create refnr and the number of selected reference (-1 due to  000000000 being a record in the context array)
                    //plus the new creations is the number of references being receipted:
                    //so fire a call refnum button press which will use the createRefFlg to indicate that the missing number of refs need creating 
                    //just as it would for a direct intake PO

                    sap.ui.getCore().byId(tabItemRowSelected.getCells()[3].getId()).firePress();
                } else {
                    if (aContexts && (aContexts.length > requiredNumDocRefs)) {
                        createRefFlg = false;
                        //Show error message as we have already specified all ref nums and none left to receipt a new ref num against	
                        sap.m.MessageBox.error(this.getResourceBundle().getText("RefSelectedDeselectCreateNew", [requiredNumDocRefs])
                            , {
                            title: this.getResourceBundle().getText("TooManyRef"),
                            onClose: null,
                            styleClass: "",
                            initialFocus: null,
                            textDirection: sap.ui.core.TextDirection.Inherit
                        });
                    }
                }
            }

            tabModel.setProperty(tabItemContext + "/Refnrs", refNrs);
            tabModel.setProperty(tabItemContext + "/IdentData", identData);
            tabModel.refresh(true);

            if (this.oDialog) {
                this.oDialog.destroy();
            }
        },

        _RefCancel: function (evt) {
            if (this.oDialog) {
                this.oDialog.destroy();
            }

        },

        getSerialCerts: function (numCertSers, productId, store) {
            var oView = this.getView();
            var oSerialCertDialog;
            var oCertSerModel = this.getView().getModel("refNumInfoCapModel");
            var aNewItem = [];
            var initialLines = parseInt(Math.abs(numCertSers), 10);

            oCertSerModel.setData(this.aCertSerData);

            this.aCertSerData.Items.length = 0;
            for (var listRow = 0; listRow < initialLines; listRow++) {
                aNewItem = {
                    store: store,
                    itemNum: listRow + 1,
                    article: productId,
                    identNum: "",
                    refNum: "",
                    gotRef: "NA",
                    serialSubmittedFlg: false, //used to determine if all odata calls to submit new ref num creations have been sent to SAP. 
                    //Each update of results of odata call create checked to screen checks for all these flags to be set to true before formating buttons 
                    needRef: false,
                    itemStatus: "",
                    confQueriedRefNumCreation: "" //has user accepted the action of creating a new ref number after being asked to confirm the action?
                    //(e.g used when serial exists for another article in a different brand)
                };
                this.aCertSerData.Items.push(aNewItem);
            }
            oCertSerModel.setData(this.aCertSerData);

            if (!oSerialCertDialog) {
                //instantiate the fragment.  Instantiation also provides the reference to the parent view id and also the controller so that the parent controller (this one) 
                //can access controls on the fragment
                oSerialCertDialog = sap.ui.xmlfragment(oView.getId(), "wos.zint.pendingsto.fragments.EnterCertSerial", this);
                //Add fragment to the view life cycle so it will execute procedures like auto destroy when view is destroyed. 
                //Also, it adding it to the view lifecycle ensures it has any models propagated from the parent view to its sub controls in the fragment. 
                oView.addDependent(oSerialCertDialog);

                oSerialCertDialog.open();
            }
        },

        dCertSerAfterOpen: function (evt) {
            var tCertSer = this.getView().byId("tCertSer");
            var certSerItems = tCertSer.getItems(); //table items
            var certSerItemFirst = certSerItems[0]; //get table's first item row

            this.findInputField(certSerItemFirst).focus();
        },

        dCertSerAfterClose: function (oEvent) {
            //List and button use IDs so ensure dialog destroyed to avoid duplicate element id errors for list and button on any subsequent openeing of dialog		
            oEvent.getSource().destroy();
        },

        onCertSerDialogBack: function (evt) {
            var dCertSer = evt.getSource().getParent(); //dialog

            dCertSer.close();
        },

        onCertSerMore: function (evt) {
            //when user adds a new line for another serial number attached to a reference number being created
            var certSerModel = this.getView().getModel("refNumInfoCapModel");
            var tabCertSer = this.getView().byId("tCertSer");
            var certSerItems = tabCertSer.getItems(); //table items
            var curRowContext = evt.oSource.getBindingContext("refNumInfoCapModel");
            var curRowNum = parseInt(curRowContext.sPath.substring(curRowContext.sPath.lastIndexOf("/") + 1), 10);
            var tableRow = evt.getSource().getParent();
            var certSerNextItem;
            tableRow.setSelected(true);

            var aNewItem = {
                store: certSerModel.getProperty(curRowContext + "/store"), //same store, itemnum and article as that in the row we are on,
                itemNum: certSerModel.getProperty(curRowContext + "/itemNum"),
                article: certSerModel.getProperty(curRowContext + "/article"),
                identNum: "", //Blank cert or serial num,
                refNum: "", //Blank refnum,
                message: "",
                gotRef: "NA",
                serialSubmittedFlg: false,
                needRef: false,
                itemStatus: "",
                confQueriedRefNumCreation: ""
            };

            sap.m.MessageBox.warning(oBundle.getText("msgAddAnotherCertLong"), {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: oBundle.getText("msgAddAnotherCertShort"),
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                initialFocus: sap.m.MessageBox.Action.NO,
                onClose: function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.NO) {
                        return;
                    } else {
                        this.aCertSerData.Items.splice(curRowNum + 1, 0, aNewItem);
                        //Add the new array record to the displayed table control	
                        certSerModel.refresh(true);
                        //setting focus does not work here as the refresh has not yet allocated a new line :-()
                        certSerNextItem = certSerItems[curRowNum + 1]; //get table's new item row
                        this.findInputField(certSerNextItem).focus();
                    }
                }.bind(this) // End In-Line Function
            }); // End MessageBox
        },

        identNumAfterChange: function (oEvent) {
            //after user entered new serial number on ref num creation screen
            var certSerModel = this.getView().getModel("refNumInfoCapModel");
            var tabCertSer = this.getView().byId("tCertSer");
            var certSerItems = tabCertSer.getItems(); //table items
            var tableLen = certSerItems.length; //Number of items in table
            var tableLastRow = tableLen - 1;
            var curRowContext = oEvent.oSource.getBindingContext("refNumInfoCapModel");
            var curRowNum = parseInt(curRowContext.sPath.substring(curRowContext.sPath.lastIndexOf("/") + 1), 10);
            var i;
            var lineTarget = curRowNum;
            var replStr;
            var idVal = "";
            var identNumCell = 3;
            var foundBlank = false;
            var confButtID = this.getView().byId("butCertSerConf");

            //set inout value to upper case
            replStr = oEvent.getSource().getValue().toUpperCase().trim();
            oEvent.getSource().setValue(replStr);
            //clear fields
            certSerModel.setProperty(curRowContext + "/needRef", "");
            certSerModel.setProperty(curRowContext + "/confQueriedRefNumCreation", "");
            certSerModel.setProperty(curRowContext + "/message", "");
            certSerModel.refresh(true);

            if (oEvent.getSource().getValue() === "") {
                return;
            }

            //Loop until end of table looking for blank ID Data field. If found put the focus there
            for (i = curRowNum; i <= tableLastRow; i++) {
                idVal = certSerItems[i].getCells()[identNumCell].getValue();
                if (idVal === "") {
                    foundBlank = true;
                    lineTarget = i;
                    certSerItems[lineTarget].getCells()[identNumCell].focus();
                    break;
                }
            }

            if (foundBlank === false) {
                //Loop from start of table to current row looking for blank ID Data field. If found put the focus there
                for (i = 0; i <= curRowNum; i++) {
                    idVal = certSerItems[i].getCells()[identNumCell].getValue();
                    if (idVal === "") {
                        foundBlank = true;
                        lineTarget = i;
                        certSerItems[lineTarget].getCells()[identNumCell].focus();
                        break;
                    }
                }
            }

            //If no blanks left then simulate pressing the Confirm button
            if (foundBlank === false) {
                confButtID.firePress();
            }

        },

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
        //                               	Pressed confirm on sub-screen which created new reference numbers based on serial numbers                                                          //                  //
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	

        onCertSerDialogConf: function (evt) {
            var aTableLen; //Number of items in table array
            var prevItem;
            var tCertSer = this.byId("tCertSer"); //certificate serial num fragment table
            var certSerItems = tCertSer.getItems(); //table items
            var certSerModel = tCertSer.getModel("refNumInfoCapModel");
            var tableLen; //Number of items in table
            var currCertSerItem; //table current row item
            var itemNum; //item number (1 per occurence of article)
            var articleNum;
            var site;
            var certSerNum; //the user entered certifcate or serial number from the list
            var firstRowForItem;
            var aCertSersEntered = [];
            var aCertSersDetailsToCheck = [];
            var aItemsCertSersDetailsToCheck = [];
            var submissionMode;

            ////////// Prepare screen for processing - remove blank serial lines, catch duplicate serials etc and redisplay screen /////////////////
            // sort model array by item ascending then ident info descending. Specified in reverse priority as last sort has priority over previous ones
            //sort on ident info ensuring blank at bottom for deletion purposes
            this.aCertSerData.Items.sort(function (element_a, element_b) {
                return element_b.identNum - element_a.identNum;
            });
            // sort on first column (item)
            this.aCertSerData.Items.sort(function (element_a, element_b) {
                return element_a.itemNum - element_b.itemNum;
            });

            //Delete blank rows beyond the first row of an item for the article
            aTableLen = this.aCertSerData.Items.length;
            prevItem = "";
            for (var listRow = 0; listRow < aTableLen; listRow++) {

                if (this.aCertSerData.Items[listRow].itemNum === prevItem && this.aCertSerData.Items[listRow].identNum === "") {
                    prevItem = this.aCertSerData.Items[listRow].itemNum;
                    //delete array record 
                    this.aCertSerData.Items.splice(listRow, 1);
                    aTableLen = this.aCertSerData.Items.length;
                    listRow--;
                } else {
                    prevItem = this.aCertSerData.Items[listRow].itemNum;
                }
            }

            //sort model array by item ascending then ident info ascending for better readibility.
            this.aCertSerData.Items.sort(function (element_a, element_b) {
                return element_a.identNum - element_b.identNum;
            });
            // sort on first column (item)
            this.aCertSerData.Items.sort(function (element_a, element_b) {
                return element_a.itemNum - element_b.itemNum;
            });

            //Process serial/cert/gia submissions 
            for (var i = 0; i < aTableLen; i++) {
                aCertSersEntered.push(this.aCertSerData.Items[i].identNum);
            }

            if (this.checkIfArrayHasDuplicates(aCertSersEntered)) {
                for (listRow = 0; listRow < aTableLen; listRow++) {
                    currCertSerItem = certSerItems[listRow]; //table current loop pass row 
                    this.aCertSerData.Items[listRow].gotRef = false;
                }
                //update the displayed table control	
                certSerModel.refresh();
                var dDups = new sap.m.Dialog({
                    title: this.getResourceBundle().getText("DuplicatesNotPermittedTitle"),
                    type: sap.m.DialogType.Confirm,
                    content: new sap.m.Text({
                        text: this.getResourceBundle().getText("DuplicatesNotPermitted")
                    }),
                    beginButton: new sap.m.Button({
                        text: this.getResourceBundle().getText("OK"),
                        press: function () {
                            dDups.close();
                        }
                    })
                });
                dDups.open();
                return;
            } else {
                for (listRow = 0; listRow < aTableLen; listRow++) {
                    currCertSerItem = certSerItems[listRow]; //table current loop pass row 
                    //accept any references previously awaiting acceptance. References retrieved or created without need to query user will have blank accepted field 
                    if (this.aCertSerData.Items[listRow].confQueriedRefNumCreation === "false") {
                        this.aCertSerData.Items[listRow].confQueriedRefNumCreation = "true";
                    }
                }
                //update the displayed table control	
                certSerModel.refresh();
            }

            for (var i = 0; i < aTableLen; i++) {
                aCertSersEntered.push(this.aCertSerData.Items[i].identNum);
            }

            var subReturnVals = [
                []
            ];
            var subReturnValsSingle = [
                []
            ];
            certSerItems = tCertSer.getItems(); //table items
            tableLen = certSerItems.length;

            subReturnVals.length = 0;
            prevItem = "1";

            firstRowForItem = 0;

            certSerModel.refresh();
            //Holds cert/serial/gia nums for items
            var certSerNumsForItem = {
                "item": "",
                "certSer": ""
            };
            certSerModel.refresh();
            //first build up array of item/serial combos by looping through table rows
            for (var listRow = 0; listRow < tableLen; listRow++) {
                currCertSerItem = certSerItems[listRow]; //table current loop pass row 
                //get current loop pass table model contents
                itemNum = certSerModel.oData.Items[listRow].itemNum;
                site = certSerModel.oData.Items[listRow].store; //site
                articleNum = certSerModel.oData.Items[listRow].article;
                certSerNum = certSerModel.oData.Items[listRow].identNum;

                //store cert num for submission 
                certSerNumsForItem = {
                    "item": itemNum,
                    "certSer": certSerNum
                };
                aItemsCertSersDetailsToCheck.push(certSerNumsForItem);

                //If user has blanked the cert/serial num then blank the message area and reset the accept flag box
                if (certSerNum === "") {
                    this.aCertSerData.Items[listRow].message = "";
                    this.aCertSerData.Items[listRow].gotRef = "NA";
                    this.aCertSerData.Items[listRow].confQueriedRefNumCreation = "";
                    this.aCertSerData.Items[listRow].serialSubmittedFlg = false;
                    this.aCertSerData.Items[listRow].needRef = false;
                }
                prevItem = itemNum;
            }

            //Got all cert/serial/gia permissions stored in array for all items. Ready to process table for refnum creation/retrieval

            prevItem = "0";
            firstRowForItem = 0;
            subReturnValsSingle.length = 0;

            for (var listRow = 0; listRow < tableLen; listRow++) {
                //get current loop pass item nuber from cell contents
                currCertSerItem = certSerItems[listRow]; //table current loop pass row 
                itemNum = certSerModel.oData.Items[listRow].itemNum;

                if (itemNum !== prevItem) {
                    firstRowForItem = listRow;
                }

                //If this is now the next item then it is ok to submit the array of serials nums we have built up previously
                if (itemNum !== prevItem) {
                    //We don't automatically create ref nums with warnings i.e. don't create refnums where seial num found on another article that is under a different brand.
                    //If user has accepted a queried ref num creation (confQueriedRefNumCreation is true), set the mode of thevref num submission to Internal. (ref nus auto created in such instances).
                    //If the last sumission for this serial did not result in a qury to the user (confQueriedRefNumCreation = blank which is not queried or false which should not be at this point)
                    //then submission mode is External (ref nums not auto created from if warned)
                    if (certSerModel.oData.Items[listRow].confQueriedRefNumCreation === 'true') {
                        submissionMode = "I";
                    } else {
                        submissionMode = "E";
                    }

                    aCertSersDetailsToCheck.length = 0;
                    for (var i = 0; i < aItemsCertSersDetailsToCheck.length; i++) {
                        if (aItemsCertSersDetailsToCheck[i].item === itemNum) {
                            aCertSersDetailsToCheck.push(aItemsCertSersDetailsToCheck[i].certSer);
                        }
                    }
                    /////////////////////////////////////////////
                    // SUBMIT ODATA CREATE ARTICLE REFNUM CALL //
                    /////////////////////////////////////////////S

                    subReturnVals[firstRowForItem] = this.SubmitRefNumInfo(this.refNumInfoCapModel, firstRowForItem, currCertSerItem, articleNum,
                        site,
                        submissionMode,
                        aCertSersDetailsToCheck, brandCheck);

                    prevItem = itemNum;
                    aCertSersDetailsToCheck = [];
                } else {
                    //Not a row for a new item of this article don't need to submit the array (aCertSersDetailsToCheck) of cert/serials built up for the item.
                    //Record a no sub in the array of returned values for ODATA sub service against the first row for item
                    if (listRow === firstRowForItem) {
                        this.updateCreateRefNumResultToScreen(listRow, "NoSub", "", "");
                    } else {
                        this.updateCreateRefNumResultToScreen(listRow, "RepRow", "", "");
                    }
                    prevItem = itemNum;
                }

                site = certSerModel.oData.Items[listRow].store;
                articleNum = certSerModel.oData.Items[listRow].article;
                certSerNum = certSerModel.oData.Items[listRow].identNum;
            }

        },

        checkIfArrayHasDuplicates: function (myArray) {
            for (var i = 0; i < myArray.length; i++) {
                if (myArray[i] === "") {
                    return true; // means it has a blank value
                }
                for (var j = i; j < myArray.length; j++) {
                    if (i != j) {
                        if (myArray[i] == myArray[j]) {
                            return true; // means there are duplicate values
                        }
                    }
                }
            }
            return false; // means there are no duplicate values.

        },

        MakeExtraCertSerArrayLine: function (aSourceArrayLine) {
            var returnedArray = [];
            returnedArray.push(aSourceArrayLine[0]);
            returnedArray.push(aSourceArrayLine[1]);
            returnedArray.push("RepRow");
            returnedArray.push(aSourceArrayLine[3]);
            return returnedArray;
        },

        SubmitRefNumInfo: function (oModel, tableRow, rowContents, article, site, mode, aRefData, doBrandCheck) {
            var returnedArray = [];
            var that = this;
            var successOdata = function (oData, oResponse) {
                var refNumReturned = oData.RefNum;
                var message = oData.Message;
                var strMessage = message;

                that.updateCreateRefNumResultToScreen(oData.CallerLink, "SubOK", strMessage, refNumReturned);

                returnedArray.push(refNumReturned);
                returnedArray.push(message);
                returnedArray.push("SubOK"); //submitted ODATA service and returned with Ref Num and without errors
                returnedArray.push(strMessage);
                return returnedArray;
            };
            var errorOdata = function (oError) {

                var aErrors = JSON.parse(oError.responseText).error.innererror.errordetails;
                var strErrors;
                var strMessage;
                var subStatus = "";
                var subRow;

                //delete this generic error raised by service when any error gets raised
                //delete message No matching entries found in database when brand validating
                //deletions outside of main loop to avoid array index issues

                for (var iaErrors = 0; iaErrors < aErrors.length; iaErrors++) {
                    if (aErrors[iaErrors].code === "/IWBEP/CX_MGW_BUSI_EXCEPTION" || (aErrors[iaErrors].code === "Z_POS/127" && doBrandCheck ===
                        "true")) {
                        aErrors.splice(iaErrors, 1);
                    }
                }

                for (var iaErrors = 0; iaErrors < aErrors.length; iaErrors++) {
                    if (aErrors[iaErrors].code === "Z_POS/171") {
                        subRow = aErrors[iaErrors].message;
                        aErrors.splice(iaErrors, 1);
                    }
                }

                for (var iaErrors = 0; iaErrors < aErrors.length; iaErrors++) {
                    if (aErrors[iaErrors].code === "Z_POS/128") {
                        aErrors.splice(iaErrors, 1);
                    }
                }

                for (var iaErrors = 0; iaErrors < aErrors.length; iaErrors++) {
                    strMessage = aErrors[iaErrors].message;
                    //Overriding ODATA service returned messages as other callers of the underlying function module may need the original message.
                    //they may be looking up not creating the ref num
                    if (aErrors[iaErrors].code === "Z_POS/111") {
                        strMessage = that.getResourceBundle().getText("Serial/GIA/CertAlreadyAssigned");
                        //"SERIAL/GIA/CERT has already been assigned a reference #. ";
                    }
                    if (aErrors[iaErrors].code === "Z_POS/127") {
                        if (doBrandCheck === true) {
                            strMessage = that.getResourceBundle().getText("SerialNumNotInRefTable");
                            //"This serial number is not in the Brand Reference Table. ";
                        } else {
                            strMessage = that.getResourceBundle().getText("ReferenceToBeCreated");
                            //"Reference # needs to be created for the data entered. ";
                        }
                    }

                    if (aErrors[iaErrors].code === "Z_POS/106") {
                        if (doBrandCheck === true) {
                            strMessage = aErrors[iaErrors].message + ". ";
                        }
                    }

                    if (aErrors[iaErrors].code === "Z_POS/107" || aErrors[iaErrors].code === "Z_POS/141") {
                        if (doBrandCheck === true) {
                            strMessage = that.getResourceBundle().getText("EmailMerchEnq");
                            //"Please Email Merchandise Enquiries to update the Serial number in the database. ";
                        }
                    }

                    if (aErrors[iaErrors].code === "Z_POS/130") {
                        strMessage = that.getResourceBundle().getText("CollectPrintedLabel");
                        //"Label printed. Please collect from the label printer. ";
                    }

                    if (aErrors[iaErrors].code === "Z_POS/095") {
                        strMessage = that.getResourceBundle().getText("RefInProcessByAnotherUser");
                        //"This was because the references for this article are being processed by another user. ";
                    }

                    if (aErrors[iaErrors].code === "Z_POS/172") {
                        strMessage = that.getResourceBundle().getText("CheckSerialNum");
                            //"Please check your serial number is correct and email Merchandise Enquiries to add the serial number to the Brand Reference Table. ";
                    }

                    //build error string
                    if (iaErrors === 0) {
                        strErrors = strMessage;
                    } else {
                        strErrors = strErrors + strMessage;
                    }

                    //Below, set flags that drive display statuses of table cell contents 

                    if (aErrors[iaErrors].code === "Z_POS/111" || aErrors[iaErrors].code === "Z_POS/113" || aErrors[iaErrors].code === "Z_POS/105" ||
                        aErrors[iaErrors].code === "Z_POS/106" || aErrors[iaErrors].code === "Z_POS/126" || aErrors[iaErrors].code === "Z_POS/095" ||
                        aErrors[iaErrors].code === "Z_POS/172" || (aErrors[iaErrors].code === "Z_POS/127" && doBrandCheck === true)) {
                        //error where entered cert/ser/gia cannot be accepted and not ref num created. 
                        //It needs fixing - canot be accepted or moped up later in life of item

                        //SERIAL/GIA/CERT # & belongs to a different Store.
                        //OR More than one reference number found. Please correct.
                        //OR SERIAL/GIA/CERT # belongs to a different Article
                        //OR new ref create failed on non-validated data
                        //OR locking error
                        //OR brand serial data reference num check required but it failed. Create STO requires data to be on brand ref table before allowing transfer

                        subStatus = "SubErrsRej";
                    }
                    ///If above flags not set it is a  general error whereby the user can accept the system creating a new ref num
                    if (subStatus === "") {
                        subStatus = "SubErrs";
                    }
                }

                that.updateCreateRefNumResultToScreen(subRow, subStatus, strErrors);

                returnedArray.push("");
                returnedArray.push(aErrors);
                returnedArray.push(subStatus);
                returnedArray.push(strErrors);
                return returnedArray;

            };

            if (aRefData.length === 0) {
                returnedArray.push("");
                returnedArray.push("");
                returnedArray.push("NoSub"); //No seials or certs so don't call ODATA service
                returnedArray.push("");
                return returnedArray;
            }

            var params = {};
            params.success = successOdata;
            params.error = errorOdata;
            params.async = false;

            var newSubItems = [];
            for (var i = 0; i < aRefData.length; i++) {
                var newSubItem = {
                    "ArticleCounter": 1,
                    "ItemCounter": i + 1,
                    "Data": aRefData[i]
                };
                newSubItems.push(newSubItem);
            }
            var newRefNumPost = {
                "ArticleCounter": 1,
                "RefNum": "",
                "Werks": site,
                "Matnr": article,
                "ExternalFlag": mode,
                "DataFlag": "D",
                "SkipRefTran": "X",
                "SkipRefStoreTran": "X",
                "Message": "",
                //always print label for about to be created ref and even if ref num already found/created as this call is from create ref screen and if user 			
                //already had a label they would know the ref num and would not be seeking to create a new ref num for the serial data.
                "PrintLabel": "X",
                "CallerLink": tableRow,
                "RefNumPostItemSet": newSubItems
            };

            var oModelOdata = this.getView().getModel("refCaptureOdata");

            oModelOdata.create("/RefNumPostHeadSet", newRefNumPost, params);

            return returnedArray;
        },

        updateCreateRefNumResultToScreen: function (tableRow, subStatus, message, refNum) {
            //reflect results of the attempt to create new ref nums back onto the screen
            var certSerModel = this.getView().getModel("refNumInfoCapModel");
            var currItemNum;
            var prevItemNum;
            var allItemsSubmitted;
            var currItemGotRef;
            var allItemsGotRef;
            var tableLen = this.aCertSerData.Items.length; //Number of items in table
            var currCertSerItem; //table current row item
            var validRefNum; //single found/created ref num
            var allSelectedRefNums; //list of all pre-selected and found/created ref nums
            var validCertSer; //single certificate/serial number for a found/created ref num
            var allSelectedCertSers; //list of all certificate/serial numbers for pre-selected and found/created ref nums
            var detailViewModel = this.getView().getModel("detailView");
            var globalDataModel = this.getView().getModel("globalData");
            var detailViewTabRowSelected = globalDataModel.getProperty("/butTabRow");
            var detailViewTabItemContext = detailViewTabRowSelected.getBindingContext("detailView");
            var preSelectedRefNums = detailViewModel.getProperty(detailViewTabItemContext + "/Refnrs"); //refnums and certificate/serials already selected
            var preSelectedCertSers = detailViewModel.getProperty(detailViewTabItemContext + "/IdentData"); //prior to entry into this create sub-screen
            var aPreSelectedRefNums = new Array(); //arrays used to check for if entered ref nums and serials were already
            var aPreSelectedCertSers = new Array(); //pre-selected (to prevent duplicates)

            //this.aCertSerData.Items[tableRow]["needRef"] and this.aCertSerData.Items[tableRow]["gotRef"] fields hold whether table line needs to obtain a ref num 
            //and if it got one. This will count towards the total number of ref nums to be identidied/created by this subscreen. 

            //Note: Post pending / post PGI app will NOT allow a ref num to be created when the brand check is failed (if brand check needed on that article).

            // Update the array that the certificate creation table fragment is bound to
            this.aCertSerData.Items[tableRow].message = message;
            this.aCertSerData.Items[tableRow].refNum = refNum;
            this.aCertSerData.Items[tableRow].serialSubmittedFlg = true;

            if (subStatus === "SubOK") {
                //Submitted OK- set table row  to succesful state
                this.aCertSerData.Items[tableRow].needRef = false;
                this.aCertSerData.Items[tableRow].gotRef = true;
                this.aCertSerData.Items[tableRow].confQueriedRefNumCreation = "";

            }
            if (subStatus === "SubErrs") {
                //Service errored - set table row  to errored but able to confirm acceptance e.g. serial exists for another article under a DIFFERENT BRAND
                this.aCertSerData.Items[tableRow].needRef = true;
                this.aCertSerData.Items[tableRow].gotRef = false;
                this.aCertSerData.Items[tableRow].message = message + this.getResourceBundle().getText("AcceptNewRef");
                //" Accept a new reference#?.";
                this.aCertSerData.Items[tableRow].confQueriedRefNumCreation = "false";
            }

            if (subStatus === "SubErrsRej") {
                //Service errored and this cer/serial/GIA CANNOT BE USED to create a refnum created or be accepted by the user. May be attached to a Ref num
                //that exists at another site for another article under the SAME BRAND, for example - set table row  to state that does not have check box.
                //Any row where this happens is enough to prevent all items being treated as accepted

                this.aCertSerData.Items[tableRow].needRef = true;
                this.aCertSerData.Items[tableRow].gotRef = false;
                this.aCertSerData.Items[tableRow].message = message + " " + this.getResourceBundle().getText("STOCannotBePostedInvalidSerialNum");
                //" STO cannot be posted without a valid serial number";
                this.aCertSerData.Items[tableRow].confQueriedRefNumCreation = "";
            }

            if (subStatus === "RepRow") {
                //Repeated Row- reflect first row for this item
                this.aCertSerData.Items[tableRow].needRef = false;
                this.aCertSerData.Items[tableRow].gotRef = true;

            }

            if (subStatus === "NoSub") {
                //Service call not submitted for this row 
                //Store variables for use in in loop pass if the next loop pass is for a line with a repeated item status (RepRow)
                //RepRow item will never be the first row for an item so it works
            }

            prevItemNum = 0;
            allItemsSubmitted = true;
            for (var listRow = 0; listRow < tableLen; listRow++) {
                currCertSerItem = this.aCertSerData.Items[listRow]; //table current loop pass row 
                currItemNum = currCertSerItem.itemNum;
                if (currItemNum !== prevItemNum && currCertSerItem.serialSubmittedFlg === false) {
                    // not all item serial lines have been submitted yet so this is not the last time the program flow will enter this updateCreateRefNumResultToScreen function so cannot 
                    // determine yet if all items in this subscreen have been dealt with and so cannot update text on sub-screen main push buttons
                    allItemsSubmitted = false;
                    allItemsGotRef = false;
                }
            }

            //If all items submitted (last time this function called for this subscreen) then we are ready to detemine the text on the main push buttons for this sub-screen
            //                          COULD REWORK THIS TO USE PROMISES AND PROMISE.ALL IN THE SAME WAY AS SONE ON THE POST STO BUTTON	

            if (allItemsSubmitted === true) {
                allItemsGotRef = true;
                allSelectedRefNums = "";
                allSelectedCertSers = "";

                //Build arrays for refnums and certificate/serial nums pre-selected before entering this ref num creation sub-screen
                if (typeof preSelectedRefNums !== "undefined") {
                    //build array of previously selected ref nums
                    aPreSelectedRefNums.length = 0;
                    if (preSelectedRefNums.length !== 0) {
                        //remove spaces from refnums string
                        preSelectedRefNums = preSelectedRefNums.replace(/\s+/g, "");
                        aPreSelectedRefNums = preSelectedRefNums.split(",");
                    }
                }
                if (typeof preSelectedCertSers !== "undefined") {
                    //build array of previously selected ref nums
                    aPreSelectedCertSers.length = 0;
                    if (preSelectedCertSers.length !== 0) {
                        preSelectedCertSers = preSelectedCertSers.replace(/\s+/g, "");
                        aPreSelectedCertSers = preSelectedCertSers.split(",");
                    }
                }

                allSelectedRefNums = preSelectedRefNums;
                allSelectedCertSers = preSelectedCertSers;
                for (var listRow = 0; listRow < tableLen; listRow++) {
                    currCertSerItem = this.aCertSerData.Items[listRow]; //table current loop pass row 
                    currItemGotRef = true;
                    validRefNum = "";
                    validCertSer = "";

                    //If the invisible accepted checkbox is accepted then a ref num was found/created for that article item line/index of the table/array					
                    if (currCertSerItem.gotRef === true) {
                        currItemGotRef = true;
                        validRefNum = this.aCertSerData.Items[listRow].refNum;
                        validCertSer = this.aCertSerData.Items[listRow].identNum;
                    }

                    //If the invisible accepted checkbox is enabled but not selected then a ref num was not found/created for that article item line/index of the table/array
                    if (currCertSerItem.needRef === true && currCertSerItem.gotRef !== true) {
                        currItemGotRef = false;
                        //but also check to see if any other index of the  table's underlying array has an enabled and accepted status for this item of the article. Any such accepted state of
                        //an entered serial/certificate num wil denote a successfully assigned ref number which counts towards the total number of ref nums this sub-screen is to assign.
                        for (var listRow2 = 0; listRow2 < tableLen; listRow2++) {
                            if (this.aCertSerData.Items[listRow2].itemNum === currCertSerItem.itemNum && this.aCertSerData.Items[listRow2].needRef == true &&
                                this.aCertSerData.Items[listRow2].gotRef === true) {

                                currItemGotRef = true;
                                validRefNum = this.aCertSerData.Items[listRow2].refNum;
                                validCertSer = this.aCertSerData.Items[listRow].identNum;
                            }
                        }
                        if (currItemGotRef === false) {
                            // If this current item of this article has no assigned ref num at all for any of it's entered serials then not all items have been accepted/assigned. 
                            // This drives button display.
                            allItemsGotRef = false;
                            break;
                        }
                    }
                    if (currItemGotRef === true && validRefNum !== "") {
                        if (aPreSelectedRefNums.includes(validRefNum) === false) {
                            //Add to list of pre-selected and created/found ref nums 
                            if (allSelectedRefNums === "") {
                                allSelectedRefNums = validRefNum;
                            } else {
                                allSelectedRefNums = allSelectedRefNums + ", " + validRefNum;
                            }
                        }

                        if (aPreSelectedCertSers.includes(validCertSer) === false) {
                            //Add to list of accompanying certificate/serial numbers for pre-selected and created/found  ref nums
                            if (allSelectedCertSers === "") {
                                allSelectedCertSers = validCertSer;
                            } else {
                                allSelectedCertSers = allSelectedCertSers + ", " + validCertSer;
                            }
                        }
                    }
                }

                certSerModel.refresh();
                if (allItemsSubmitted === true && allItemsGotRef === true) {
                    this.getView().byId("butCertSerBack").setText(this.getResourceBundle().getText("closeColumn"));
                    this.getView().byId("butCertSerConf").setVisible(false);

                    detailViewModel.setProperty(detailViewTabItemContext + "/Refnrs", allSelectedRefNums);
                    detailViewModel.setProperty(detailViewTabItemContext + "/IdentData", allSelectedCertSers);
                    detailViewModel.refresh(true);

                } else {
                    this.getView().byId("butCertSerBack").setText(this.getResourceBundle().getText("Back"));
                    this.getView().byId("butCertSerConf").setVisible(true);
                }
            } // end if (allItemsSubmitted === true)

        },

        getItemsTable: function () {
            return this.byId("items");
        },



        displayPdf: function (ebeln) {
            var sService = "/sap/opu/odata/sap/ZINT_PEX_GOODSISSUE_SRV/pdfSet(Ebeln='" + ebeln + "')" + "/$value";
            oContainer = this.getView().byId("pdfContainer");
            var oContent = "<iframe src=\"" + sService + "\" embedded=\"true\" style=\"width:100%; height:100%;\" frameborder=\"0\"></iframe>";

            oContainer.setContent(oContent);

        },

        onPressClosePdf: function () {
            //remove the content from the iframe
            var oContent = "";
            oContainer.setContent(oContent);
            //hide the close button for the PDF iframe
            var btnId = this.byId("btnClose").getId();
            sap.ui.getCore().byId(btnId).setProperty("visible", false);
        },

        handleIconTabBarSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var that = this;
            var oView = this.getView();
            var sPath;
            var oObject;
            if (sKey.indexOf("iconTabBarFilter2") !== -1) {
                // the pdf tab has been clicked
                sPath = oView.getElementBinding().getPath();
                oObject = oView.getModel().getObject(sPath);

                that.displayPdf(oObject.Ebeln);
                //show the close button for the PDF iframe
                var btnId = that.byId("btnClose").getId();
                sap.ui.getCore().byId(btnId).setProperty("visible", true);

            }
        },

        /**
         * Event handler when the share by E-Mail button has been clicked
         * @public
         */
        onSendEmailPress: function () {
            var oViewModel = this.getModel("detailView");

            URLHelper.triggerEmail(
                null,
                oViewModel.getProperty("/shareSendEmailSubject"),
                oViewModel.getProperty("/shareSendEmailMessage")
            );
        },


        /**
         * Updates the item count within the line item table's header
         * @param {object} oEvent an event containing the total number of items in the list
         * @private
         */
        onListUpdateFinished: function (oEvent) {
            var sTitle,
                iTotalItems = oEvent.getParameter("total"),
                oViewModel = this.getModel("detailView"),
                postId = this.byId("btnPost").getId(),
                btnPDFId = this.byId("iconTabBarFilter2").getId();

            // only update the counter, clear messages and activate save button if the length of the list is final
            if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
                if (iTotalItems) {
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
                } else {
                    //Display 'Line Items' instead of 'Line items (0)'
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
                }
                oViewModel.setProperty("/lineItemListTitle", sTitle);

                //activate thereprint pdf button
                sap.ui.getCore().byId(btnPDFId).setProperty("visible", false);

                //close any open MessageStrips
				/*var oView = this.getView().byId("page");
				var oContent = oView.getContent();
				for (var n = 0; n < oContent.length; n++) {
					if (oContent[n].sId.indexOf("strip") !== -1) {
						oView.removeContent(oContent[n].sId);
					}
				}*/
            }
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            var that = this;
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel().metadataLoaded().then(function () {
                var sObjectPath = this.getModel().createKey("STOHeaderSet", {
                    Ebeln: sObjectId
                });
                this._bindView("/" + sObjectPath);
            }.bind(this));

            /// Manually bind back end ODATA call to read STO header and items. Will put this into isolated JSON model so it can be supplemented 
            // by articlerReference number info entered by user. Isolating the model means the user suuplied reference data is not blanked if an implicit
            //refresh of data from the back end occurs 
            this.getModel().metadataLoaded().then(function () {

                var sSTOHeadPath = that.getModel().createKey("STOHeaderSet", {
                    Ebeln: sObjectId
                });
                that.getModel().read("/" + sSTOHeadPath, {
                    urlParameters: {
                        "$expand": "STOItemSet"
                    },
                    success: function (oData, response) {
                        //update model that STO screen view is based on
                        that.getModel("detailView").setData(oData);
                    }.bind(this),

                    error: function (oData, response, index) {
                        console.log("Error!!");
                    }.bind(this)
                });
            });
        },

        /**
         * Binds the view to the object path. Makes sure that detail view displays
         * a busy indicator while data for the corresponding element binding is loaded.
         * @function
         * @param {string} sObjectPath path to the object to be bound to the view.
         * @private
         */
        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearMasterListSelection();
                return;
            }

            var sPath = oElementBinding.getPath(),
                oResourceBundle = this.getResourceBundle(),
                oObject = oView.getModel().getObject(sPath),
                sObjectId = oObject.Ebeln,
                sObjectName = oObject.Ebeln,
                oViewModel = this.getModel("detailView");

            this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        },

        onChangeParcelRef: function (oControlEvent) {
            //when changing pending STO parcel reference	
            var oView = this.getView().byId("page");
            var params = oControlEvent.getParameters();
            var parcelRefId = params.id;
            var parcelRef = params.value;
            var postId = this.byId("btnPost").getId();
            var postBut = this.getView().byId(postId);
            var sParcelRefErrMsg = oBundle.getText("msgParcelRefError");

            if (this.validateParcelRef(parcelRef)) {
                sap.ui.getCore().byId(parcelRefId).setValueState(sap.ui.core.ValueStateNone);
                //close any open parcelref messageStrips
                var oContent = oView.getContent();
                for (var n = 0; n < oContent.length; n++) {
                    if (oContent[n].sId.indexOf("strip") !== -1 && oContent[n].getText() === sParcelRefErrMsg) {
                        oView.removeContent(oContent[n].sId);
                    }
                }
                //activate the save button
                postBut.setEnabled(true);
            } else {
                //show parcelref messageStrips
                oMSG = new MessageStrip({
                    text: sParcelRefErrMsg,
                    showIcon: true,
                    showCloseButton: true,
                    type: "Error"
                });
                oView.addContent(oMSG);

                sap.ui.getCore().byId(parcelRefId).setValueState(sap.ui.core.ValueState.Error);
                sap.ui.getCore().byId(parcelRefId).setValueStateText(sParcelRefErrMsg);
                //deactivate the save button
                postBut.setEnabled(false);
            }
        },


        //USER PRESSED FINAL POST BUTTON FOR PGI
        onSavePress: function () {

            var oModel = this.getView().getModel(); // unnamed model
            var oView = this.getView();
            var screenTableModel = this.getView().getModel("detailView");
            var STONum = screenTableModel.getProperty("/Ebeln");
            var parcelRefId = sap.ui.getCore().byId("parcelRefId");
            var parcelRefValue = screenTableModel.getProperty("/ParcelRef");
            var postId = this.byId("btnPost").getId();
            var postBut = this.getView().byId(postId);

            var that = this;

            // Final validation

            //Display error if Parcel Ref not ok
            if (!this.validateParcelRef(parcelRefValue)) {
                var sMsg = oBundle.getText("msgParcelRefError");
                sap.ui.getCore().byId(parcelRefId).setValueState(sap.ui.core.ValueState.Error);
                sap.ui.getCore().byId(parcelRefId).setValueStateText(sMsg);
                //deactivate the save button
                postBut.setEnabled(false);
                oMSG = new MessageStrip({
                    text: sMsg,
                    showIcon: true,
                    showCloseButton: true,
                    type: "Error"
                });
                oView.addContent(oMSG);
                return; //Go no further - drop out of validation and saving
            }

            //			Check if article references are still ok. This chain of calls eventally will call post of PGI if all Art refs ok OR display errro message adn return here without posting PGI
            if (!this.validateArtRefs()) {
                //Do not continue if Article referernces not ok
                return;
            }
        },

        validateParcelRef: function (parcelRefValue) {
            if (parcelRefValue.length <= 16 && parcelRefValue !== "") {
                return true;
            } else {
                return false;
            }
        },

        validateArtRefs: function () {
            var screenTableModel = this.getView().getModel("detailView");
            var screenTabData = screenTableModel.getData();
            var screenTabItems = screenTabData.STOItemSet.results;
            var aCheckRefNumsResult = new Array();
            var refNumsNeedSaving;
            var refNumsOK;

            isError = false;

            //checkRefNums returns an array where entry [0] will be true if there are any reference numbers to to be recorded and false if not. 
            //The second entry [1] if true if if all the necessary ref nums have been supplied and  none are duplicated for the same article on multiple lines of the STO. [1] is false if this fails. 
            aCheckRefNumsResult = this.checkRefNums();
            refNumsNeedSaving = aCheckRefNumsResult[0];
            refNumsOK = aCheckRefNumsResult[1];

            if (refNumsNeedSaving === false) {
                //no ref nums supplied so will not be saving any.
                //But, were any actually needed? i.e. were enough valid/ok ref nums specified?
                if (refNumsOK === true) {
                    ////////////////////////////////////////////////////////////////////
                    //no ref nums were required anyway, so proceed to Post the PGI    //
                    ////////////////////////////////////////////////////////////////////
                    this.doPost();
                } else {
                    //the required ref nums have not been supplied so set global flag isError to true				
                    isError = true;
                    this.addMessageStrip("{i18n>msgFixBeforeSave}", "Error", true, true);
                }
            } else {
                //user did supply some ref nums. Were there enough valid/ok refnums?
                if (refNumsOK === true) {
                    //RefNums ok to save/move to target store, so try to do so. The saveRefNumsToReceivingStore procedure will submit all needed to SAP and 
                    //WHEN ALL RESPONSES FROM ODATA RECEIVED it will either proceed to try and post the STO or will give an error notification
                    this.saveRefNumsToReceivingStore(screenTabItems, screenTabData.Werks);
                } else {
                    //the required ref nums have not been supplied or clash so set global flag isError to true				
                    isError = true;
                    this.addMessageStrip("{i18n>msgFixBeforeSave}", "Error", true, true);
                }
            }

        },

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        checkRefNums: function () {
            //Checks that the screen/model (model = "detailView") contains necessary reference numbers for articles that require them and 
            //that the ref nums selected are not duplicated (no item lines with the same product are moving the same ref nums)
            refNumSaveError = false;
            var oViewModel = this.getView().getModel("detailView");
            var STOTabData = oViewModel.getData();
            var STOTabItems = STOTabData.STOItemSet.results;
            var refNumsToSave = false;
            var allRefNumsSpecified = true;
            var aProdRefNums = new Array();
            var aProdsWithDupRefs = new Array();
            var RefNumClash = false;
            var STOQty;
            var requiredNumoOfRefs;

            aProdsWithDupRefs.length = 0;
            for (var tabLine = 0; tabLine < STOTabItems.length; tabLine++) {
                //Create array of ref nums for each article where user has specified reference numbers.
                //If the user has specified any ref nums at all to save then set RefNumsToSave to true
                if (STOTabItems[tabLine].Refnrs !== "" && typeof (STOTabItems[tabLine].Refnrs) !== "undefined") {
                    aProdRefNums = (STOTabItems[tabLine].Refnrs.split(","));
                    for (var refNumIndex = 0; refNumIndex < aProdRefNums.length; refNumIndex++) {
                        aProdRefNums[refNumIndex].trim();
                    }
                    refNumsToSave = true;
                } else {						// this else clause will probably also need adding into the Create STO app
                    aProdRefNums = [];
                }

                if ((STOTabItems[tabLine].CertFlg !== "X" && STOTabItems[tabLine].MerchCat !== "1730" && STOTabItems[tabLine].MerchCat !==
                    "1777") || STOTabData.Bsart !== 'ZCTO') {
                    //Not an article requiring a reference number, (not Rolex or Tudor and also cerficate flag not set) or not an ZCTO order, 
                    //so skip the ref num save phase
                    continue;
                }

                //Skip this item line if the STO quantity is 0
                STOQty = STOTabItems[tabLine].Menge;
                requiredNumoOfRefs = parseInt(Math.abs(STOQty), 10);
                if (requiredNumoOfRefs === 0) {
                    continue;
                }

                //Flag if the required number of reference numbers have not been specified
                if (requiredNumoOfRefs !== aProdRefNums.length && requiredNumoOfRefs !== 0) {
                    sap.m.MessageBox.error(this.getResourceBundle().getText("EnterRefForArticle", [STOTabItems[tabLine].Matnr])
                        //"Please go back and enter the reference #s for article " + STOTabItems[tabLine].Matnr
                        , {
                        title: this.getResourceBundle().getText("SelectRef"),
                        //"Select reference #s",
                        onClose: null,
                        styleClass: "",
                        initialFocus: null,
                        textDirection: sap.ui.core.TextDirection.Inherit
                    });
                    allRefNumsSpecified = false;
                }

                //If all refnums that are  to be allocated are fully specified, then check them for duplication if document contains the same article on seperate item lines
                if (allRefNumsSpecified === true) {
                    aProdsWithDupRefs = this.getProductsWithRefNumClash(STOTabItems);
                    if (aProdsWithDupRefs.length > 0) {
                        RefNumClash = true;
                        sap.m.MessageBox.error(this.getResourceBundle().getText("DuplicateRefError", [aProdsWithDupRefs[0]])
                            //"Error: Artcle " + aProdsWithDupRefs[0] + " is specifed on multiple lines and has duplicated reference #s. Please go back and correct this."
                            , {
                            title: this.getResourceBundle().getText("DuplicateReference"),
                            //"Duplicated reference #s",
                            onClose: null,
                            styleClass: "",
                            initialFocus: null,
                            textDirection: sap.ui.core.TextDirection.Inherit
                        });
                    }
                }
            }

            //There are no reference numbers to save/move so return this along with if we thus are failing to specify and some were required
            if (refNumsToSave === false) {
                if (allRefNumsSpecified === false || RefNumClash === true) {
                    return [false, false];
                } else {
                    return [false, true];
                }
            }

            //There are refNums to specified to save/move so whether return this. Also return if ALL required ref nums are supplied OR supplied ref nums clash with duplicates 
            //specified across STO lines. Return false (ref num supplied check failed) if reference numbers are required for this STO 
            if (allRefNumsSpecified === false || RefNumClash === true) {
                return [true, false];
            } else {
                return [true, true];
            }
        },

        getProductsWithRefNumClash: function (aDocItemsAndRefs) {
            var atmp = [];
            var aProdRefs = [];
            var hasDups;
            var aProductsWithDups = [];

            hasDups = false;
            aProductsWithDups.length = 0;

            for (var docItemsLineCnt = 0; docItemsLineCnt < aDocItemsAndRefs.length; docItemsLineCnt++) {
                //if there are refs to clash check 
                if (aDocItemsAndRefs[docItemsLineCnt].Refnrs !== "" && typeof aDocItemsAndRefs[docItemsLineCnt].Refnrs !== "undefined") {
                    //Get all item lines for the current product in the main loop
                    aProdRefs.length = 0;
                    for (var matchLoopCnt = 0; matchLoopCnt < aDocItemsAndRefs.length; matchLoopCnt++) {
                        atmp.length = 0;
                        if (aDocItemsAndRefs[matchLoopCnt].Matnr === aDocItemsAndRefs[docItemsLineCnt].Matnr) { //if article nums match
                            if (aDocItemsAndRefs[matchLoopCnt].Refnrs !== "" && typeof aDocItemsAndRefs[matchLoopCnt].Refnrs !== "undefined") {
                                atmp = aDocItemsAndRefs[matchLoopCnt].Refnrs.split(",");
                            }
                            for (var tmpCnt = 0; tmpCnt < atmp.length; tmpCnt++) { // loop around article refs on this doc line
                                aProdRefs.push(atmp[tmpCnt].trim()); //append this ref to array of article's refs
                            }
                        }
                    }
                    //Does the array of article refs contain duplicates?
                    hasDups = this.chkArrayDuplicates(aProdRefs, true);
                    if (hasDups) {
                        //add to list of article's with duplicate refs
                        aProductsWithDups.push(aDocItemsAndRefs[docItemsLineCnt].Matnr);
                    }
                }
            }
            return aProductsWithDups;
        },

        chkArrayDuplicates: function (arr, justCheck) {
            var len = arr.length,
                tmp = {},
                arrtmp = arr.slice(),
                dupes = [];
            arrtmp.sort();
            while (len--) {
                var val = arrtmp[len];
                if (val === "No Reference #") {
                    continue; //next loop pass
                }
                if (/nul|nan|infini/i.test(String(val))) {
                    val = String(val);
                }
                if (tmp[JSON.stringify(val)]) {
                    if (justCheck) {
                        return true;
                    }
                    dupes.push(val);
                }
                tmp[JSON.stringify(val)] = true;
            }
            return justCheck ? false : dupes.length ? dupes : null;
        },

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
        //                     	      		   Save Reference Nums to receiving store prior to posting the PGI on this pending STO                                                                                //
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	

        saveRefNumsToReceivingStore: function (STOTableItems, ReceiveSite) {
            var oModel = this.getView().getModel("refNumSave");
            var aProdRefDocs = []; //Ref Doc numbers for 1 article
            var newRefNumPost = {}; //new reference number information used to post
            var trimmedRefnrs;
            var stoQty;
            var requiredNumOfRefs;
            var aSaveRefNumsPromises = new Array();
            var that = this;

            refNumSaveError = false;
            //Loop around STO table lines
            for (var tabLine = 0; tabLine < STOTableItems.length; tabLine++) {
                stoQty = STOTableItems[tabLine].Menge;
                requiredNumOfRefs = parseInt(Math.abs(stoQty), 10);

                if (STOTableItems[tabLine].Refnrs !== "" && STOTableItems[tabLine].Refnrs !== "_" && typeof STOTableItems[tabLine].Refnrs !==
                    "undefined") {
                    trimmedRefnrs = STOTableItems[tabLine].Refnrs.trim(); //list of ref nums for this STO table items"

                } else {
                    trimmedRefnrs = "";

                }
                aProdRefDocs.length = 0;
                if (trimmedRefnrs !== "" && typeof trimmedRefnrs !== "undefined") {
                    aProdRefDocs = trimmedRefnrs.split(",");
                }
                //Allocate reference numbers where ref nums for current STO table line were selected and the number of refs nums is the number required. 
                if (aProdRefDocs.length !== 0 && (aProdRefDocs.length === requiredNumOfRefs)) {
                    //Loop around the ref nums for this STO item table line and allocate them with an ODATA call import per ref num on this article
                    for (var refDocCount = 0; refDocCount < aProdRefDocs.length; refDocCount++) {
                        if (aProdRefDocs[refDocCount].trim() !== "No Reference #") {
                            var newSubItems = [];
                            var newSubItem = {
                                "ArticleCounter": 1,
                                "ItemCounter": 1,
                                "Data": aProdRefDocs[refDocCount].trim()
                            };
                            newSubItems.push(newSubItem);

                            newRefNumPost = {
                                "ArticleCounter": 1,
                                "RefNum": "",
                                "Werks": ReceiveSite,
                                "Matnr": STOTableItems[tabLine].Matnr,
                                "ExternalFlag": "E",
                                "DataFlag": "N",
                                "SkipRefTran": "",
                                "SkipRefStoreTran": "",
                                "Message": "",
                                "PrintLabel": "",
                                "RefNumPostItemSet": newSubItems
                            };

                            //Save promise to array of promises to be resolved with promise.all
                            aSaveRefNumsPromises.push(
                                ODataHelper.callCREATEOData(oModel, "/RefNumPostHeadSet", newRefNumPost)
                                    .then(function (data) {

                                        //eturned entity is in the variable oData. It will be empty if the ODATA create for ref num executed without crashing but did not perform the save
                                        if (data.Matnr === "") {
                                            refNumSaveError = true;
                                        }
                                    })
                                    .catch(function (oError) {
                                        refNumSaveError = true;
                                    })
                            );

                        } // if (aProdRefDocs[refDocCount].trim() !== "No Reference #") 
                    } //for (var refDocCount = 0; refDocCount < aProdRefDocs.length; refDocCount++) --- aProdRefDocs loop - ref docs for this STO item table line
                } //if (aProdRefDocs.length !== 0 && (aProdRefDocs.length === requiredNumOfRefs)) 
            } // STO table lines loop

            /////////////////////////////////////////////////////////////////////////////////////
            // PROMISE.ALL - THIS IS PERFORMED WHEN ALL REF NUM SAVE ODATA CALLS HAVE RETURNED //
            /////////////////////////////////////////////////////////////////////////////////////
            that = this;
            Promise.all(aSaveRefNumsPromises).then(that.handleRefNumSaveOutcome.bind(that));

        },

        handleRefNumSaveOutcome: function (values) {
            var oViewModel = this.getView().getModel("detailView");
            var STOTabData = oViewModel.getData();
            if (refNumSaveError === true) {
                //Notify there was a problem saving the ref nums					
                sap.m.MessageBox.error(this.getResourceBundle().getText("AssignArticleError", [STOTabData.Werks])
                    //"Error: there was a problem whilst attempting to assign article reference numbers to store " + STOTabData.Werks + ". STO will not be posted until this has been corrected."
                    , {
                    title: this.getResourceBundle().getText("ProblemMovingArticleRef"),
                    //"Problem moving article references",
                    onClose: null,
                    styleClass: "",
                    initialFocus: null,
                    textDirection: sap.ui.core.TextDirection.Inherit
                });
            } else {
                ////////////////////////////////////////////////////////
                //Ref nums saved ok so PROCEED TO TRY TO POST THE PGI //
                ////////////////////////////////////////////////////////
                this.doPost();
            }
        },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
        //                					   FINALLY DO THE POST OF PGI ON PENDING STO                                                                          //
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        doPost: function () {
            //do the post of the PGI
            var that = this;
            var oView = this.getView();
            var oModel = this.getView().getModel();
            var screenTableModel = this.getView().getModel("detailView");
            var screenTableData = screenTableModel.getData();
            var sSTONum = screenTableModel.getProperty("/Ebeln");
            var sParcelRef = screenTableModel.getProperty("/ParcelRef");

            this.busyDialog = new sap.m.BusyDialog();
            this.busyDialog.open();

            //do the ODATA call for the PGI		
            var newGIItems = [];

            for (var i = 0; i < screenTableData.STOItemSet.results.length; i++) {
                var newGIItem = {
                    Ebeln: "",
                    Ebelp: "",
                    Matnr: "",
                    Refnrs: "",
                    IdentData: ""
                };

                newGIItem.Ebeln = sSTONum;
                newGIItem.Ebelp = screenTableData.STOItemSet.results[i].Ebelp;
                newGIItem.Matnr = screenTableData.STOItemSet.results[i].Matnr;
                newGIItem.Refnrs = screenTableData.STOItemSet.results[i].Refnrs;
                newGIItem.IdentData = screenTableData.STOItemSet.results[i].IdentData;
                newGIItems.push(newGIItem);
            }

            oModel.create("/GoodsIssHeaderSet", {
                Ebeln: sSTONum,
                ParcelRef: sParcelRef,
                GoodsIssItemSet: newGIItems //parameter name should be the item level entityset name
            }, {
                method: "POST",
                success: function (data) {

                    that.busyDialog.close();
                    var toast = that.getResourceBundle().getText("STOProcessed",[data.Ebeln]);
                    //"The pending STO " + data.Ebeln + " has been processed.";

                    // //display the pdf (generated from Smartform)
                    that.displayPdf(data.Ebeln);

                    //show the close button for the PDF iframe
                    var btnId = that.byId("btnClose").getId();
                    var btnPDFId = that.byId("iconTabBarFilter2").getId();

                    sap.ui.getCore().byId(btnId).setProperty("visible", true);

                    //deactivate the post button
                    var postId = that.byId("btnPost").getId();
                    sap.ui.getCore().byId(postId).setEnabled(false);
                    //add success message for Part-Exchange STO goods issue
                    oView = that.getView().byId("page");

                    oMSG = new MessageStrip({
                        text: toast,
                        showIcon: true,
                        showCloseButton: true,
                        type: "Success"
                    });

                    sap.ui.getCore().byId(btnPDFId).setProperty("visible", true);
                    oView.addContent(oMSG);
                    that.getOwnerComponent().oListSelector.clearMasterListSelection();

                    //  Remove this successfully GIed STO from master view list	
                    var _oComponent = that.getOwnerComponent();
                    var oMasterList = _oComponent.oListSelector._oList;
                    var oMasterListBinding = oMasterList.getBinding("items");
                    oMasterListBinding.refresh(true);
                },
                error: function (oError) {
                    that.busyDialog.close();
                    // Extract Error information
                    var aErrors = JSON.parse(oError.responseText).error.innererror.errordetails;
                    //	Retrieve Error-Text
                    var sErrorText;
                    var sErrorCode;
                    var pos;
                    var articleStartPos;
                    var restOfStr;
                    var article;


                    oView = that.getView().byId("page");

                    //			Get rid of blank errors									
                    for (var iaErrors = 0; iaErrors < aErrors.length; iaErrors++) {
                        if (aErrors[iaErrors].code === "/IWBEP/CX_MGW_BUSI_EXCEPTION") {
                            aErrors.splice(iaErrors, 1);
                        }
                    }

                    for (var iaErrors = 0; iaErrors < aErrors.length; iaErrors++) {

                        sErrorText = aErrors[iaErrors].message;
                        sErrorCode = aErrors[iaErrors].code;
                        //Better insufficient stock message. Override SAP standard ECC one				
                        if (sErrorCode === "M7/021") {
                            pos = sErrorText.search("EA : ");
                            articleStartPos = pos + 5;
                            restOfStr = sErrorText.slice(articleStartPos);
                            pos = restOfStr.search(" ");
                            article = restOfStr.slice(0, pos);
                            sErrorText = that.getResourceBundle().getText("giInsufficientStockMsg", [article]);
                        }

                        oMSG = new MessageStrip({
                            text: sErrorText,
                            showIcon: true,
                            showCloseButton: true,
                            type: "Error"
                        });
                        oView.addContent(oMSG);

                    }

                    oMSG = new MessageStrip({
                        text: "{i18n>errorInGIMsg}",
                        showIcon: true,
                        showCloseButton: true,
                        type: "Error"
                    });
                    oView.addContent(oMSG);
                }
            });
        },

        findInputField: function (i) {
            var I = jQuery("input", i.getDomRef());
            if (I.length > 0) {
                return jQuery(I[0]).control(0);
            } else {
                return null;
            }
        },

        addMessageStrip: function (msgText, msgType, closeButt, showIcon) {
            var oView = this.getView().byId("page");
            oMSG = new MessageStrip({
                text: msgText,
                showIcon: showIcon,
                showCloseButton: closeButt,
                type: msgType
            });
            oView.addContent(oMSG);
        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailView"),
                oLineItemTable = this.byId("lineItemsList"),
                iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);
            oViewModel.setProperty("/lineItemTableDelay", 0);

            oLineItemTable.attachEventOnce("updateFinished", function () {
                // Restore original busy indicator delay for line item table
                oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
            });

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /**
         * Set the full screen mode to false and navigate to list page
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            this.getOwnerComponent().oListSelector.clearMasterListSelection();
            this.getRouter().navTo("list");
        },

        /**
         * Toggle between full and non full screen mode.
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        }
    });

});