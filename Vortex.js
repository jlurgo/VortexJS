/*
Vortex by Vortex Group is licensed under a Creative Commons Reconocimiento 3.0 Unported License.
To view a copy of this licence, visit: http://creativecommons.org/licenses/by/3.0/
Project URL: https://sourceforge.net/p/vortexnet
*/


if(typeof(require) != "undefined"){
    var NodoRouter = require("./NodoRouter").clase;
    //var NodoClienteHTTP = require("./NodoClienteHTTP").clase;
    var NodoConectorSocket = require("./NodoConectorSocket").clase;
    var NodoPortalBidi = require("./NodoPortalBidi").clase;
    var cryptico = require("cryptico");
    var io = require('socket.io-client');
    
    exports.GeneradorDeIdMensaje = require("./GeneradorDeIdMensaje").clase;
    exports.ClonadorDeObjetos = require("./ClonadorDeObjetos").clase;
    exports.PataConectora = require("./PataConectora").clase;
    exports.FiltrosYTransformaciones = require("./FiltrosYTransformaciones");
    exports.NodoMultiplexor = require("./NodoMultiplexor").clase;
    exports.NodoRouter = NodoRouter;
    exports.NodoPortalBidi = NodoPortalBidi;
    exports.NodoPortalBidiMonoFiltro = require("./NodoPortalBidiMonoFiltro").clase;
    exports.NodoConectorSocket = NodoConectorSocket;    
    //exports.NodoClienteHTTP = NodoClienteHTTP;    
    exports.NodoConectorHttpServer = require("./NodoConectorHttpServer").clase;   
    
}


var Vortex = Vx = vX = vx = {
    start:function(opt){
        this.verbose = opt.verbose;
        this.router = new NodoRouter();
        this.claveRSAComun = cryptico.generateRSAKey("VORTEXCAPO", 1024);                               //ATA
		
        this.clavePublicaComun = cryptico.publicKeyString(this.claveRSAComun);                          //PINGO
        this.portales = [];
        this.keys = [];
		
		this.lastRequest = 0;
		this.conexion_web;
    },
    conectarPorHTTP: function(p){
		if(this.conexion_web){
			this.conexion_web.alDesconectar = function(){};
			this.conexion_web.desconectarDe(this.router);
			this.adaptadorWebSockets = {};
		}
        var _this = this;
        p.verbose = this.verbose;
        p.alDesconectar = function(){
            _this.conectarPorHTTP(p);
        }
        this.adaptadorHTTP = new NodoClienteHTTP(p);
        this.router.conectarBidireccionalmenteCon(this.adaptadorHTTP);
		
		this.conexion_web = this.adaptadorHTTP;
    },
    conectarPorWebSockets: function(p){
		if(this.conexion_web){
			this.conexion_web.alDesconectar = function(){};
			this.conexion_web.desconectarDe(this.router);
			this.adaptadorHTTP = {};
		}
        var _this = this;
        var socket = io.connect(p.url);    
        this.adaptadorWebSockets = new NodoConectorSocket({
            id: "1",
            socket: socket, 
            verbose: this.verbose, 
            alDesconectar:function(){
                _this.conectarPorWebSockets(p);
            }
        });    
        this.router.conectarBidireccionalmenteCon(this.adaptadorWebSockets);
		this.conexion_web = this.adaptadorWebSockets;
    },
    conectarPorBluetoothConArduino: function(p){
        this.adaptadorArduino = new NodoAdaptadorBluetoothArduino(p);
        this.router.conectarBidireccionalmenteCon(this.adaptadorArduino);
    },
    pedirMensajes: function(p){
        var filtro = p.filtro;
        if(p.filtro.evaluarMensaje === undefined) filtro = new FiltroXEjemplo(p.filtro);    //si no tiene el método evaluarMensaje, no es un filtro. creo uno usando ese objeto como ejemplo
        var portal = new NodoPortalBidi("portal" + this.portales.length);
        portal.conectarBidireccionalmenteCon(this.router);        
        portal.pedirMensajes(filtro, p.callback); 
        this.portales.push(portal);
        return this.portales.length - 1; //devuelvo id del portal/pedido para que el cliente pueda darlos de baja
    },
    pedirMensajesSeguros: function(p, claveRSA){
        var _this = this;
		
		
        return this.pedirMensajes({
            filtro:p.filtro,
            callback: function(mensaje){
			
			
				var mi_clave_privada = _this.claveRSAComun;
				var su_clave_publica = _this.clavePublicaComun;
				
				if(mensaje.para) mi_clave_privada = claveRSA;
				if(mensaje.de) su_clave_publica = mensaje.de;
				
				
				if(mensaje.datoSeguro){
					
					var desencriptado = cryptico.decrypt(mensaje.datoSeguro, mi_clave_privada);
					
					if(desencriptado.status == "success"){
						mensaje.datoSeguro = JSON.parse(desencriptado.plaintext);
						
						if(desencriptado.signature == "verified"){
							if(su_clave_publica == desencriptado.publicKeyString){
								p.callback(mensaje);
							}
						}
					}
				} else {
					p.callback(mensaje);
				}
            }
        });
    },
    enviarMensaje:function(mensaje){
        this.router.recibirMensaje(mensaje);
    },
    enviarMensajeSeguro:function(mensaje, claveRSA){
        //var mi_clave_privada = undefined;
        var mi_clave_privada = this.claveRSAComun;
        var su_clave_publica = this.clavePublicaComun;
        if(mensaje.de) mi_clave_privada = claveRSA;
        if(mensaje.para) su_clave_publica = mensaje.para;
		
		if(mensaje.datoSeguro){
			mensaje.datoSeguro = cryptico.encrypt(JSON.stringify(mensaje.datoSeguro), su_clave_publica, mi_clave_privada).cipher;
		}
        
        this.router.recibirMensaje(mensaje);
    },
	
	addKey: function(){
		
		var claveRSA = null;
		if(typeof(arguments[0]) == 'object'){
			claveRSA = arguments[0];
		}else if(typeof(arguments[0]) == 'string'){
			claveRSA = cryptico.generateRSAKey(arguments[0], 1024);
		}
		
		
		var clavePublica = cryptico.publicKeyString(claveRSA);
		this.keys[clavePublica] = claveRSA;
		
		return clavePublica;
	},
	
	send: function(){
		
		var _this = this;
		
		
		
		var obj = null;
		
		
		var callback = null;
		var claveRSA = null;
		
		obj = arguments[0];
		
		if(arguments.length==2){
			callback = arguments[1];
		}
		//////////
		
		
		if(callback && obj.de){
			
			obj.idRequest = ++this.lastRequest;
			
			var idPortal = this.when({
				responseTo: obj.idRequest,
				para: obj.de
			},function(objRespuesta){
				callback(objRespuesta);
				_this.portales.splice(idPortal, 1);
			});
		}
		
		
		
		if(obj.de){
			claveRSA = this.keys[obj.de];
			
			this.enviarMensajeSeguro(obj, claveRSA);
			return;
		}
		
		if(!obj.de && obj.para){
			this.enviarMensajeSeguro(obj);
			return;
		}
		
		this.enviarMensaje(obj);
		
	},
	
	when: function(){
		
		var _filtro = arguments[0];
		var _callback = arguments[1];
		
		if(_filtro.para){
			return this.pedirMensajesSeguros({
				filtro: _filtro,
				callback: _callback
			}, this.keys[_filtro.para]);
		}
		
		
		if(_filtro.de && !_filtro.para){
			return this.pedirMensajesSeguros({
				filtro: _filtro,
				callback: _callback
			});
			
		}
		
		
		return this.pedirMensajes({
			filtro: _filtro,
			callback: _callback
		});
		
		
	}
};

if(typeof(require) != "undefined"){
    exports.Vortex = Vortex;
}