sap.ui.define([],function(){
	
	return {
		callCREATEOData: function(oModel, sPath, oNewData){
			return new Promise(function(resolve, reject){
				oModel.create(sPath, oNewData, {
						success: function (receivedData) {
							resolve(receivedData);
						},
						
						error: function (oError) {
							reject(oError);
						}
				});  //create
			});  //promise
		} //callCREATEOData
	};  
	
});