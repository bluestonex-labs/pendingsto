sap.ui.define([],function(){return{callCREATEOData:function(n,e,c){return new Promise(function(r,t){n.create(e,c,{success:function(n){r(n)},error:function(n){t(n)}})})}}});