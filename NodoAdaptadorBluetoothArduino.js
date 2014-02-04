var NodoAdaptadorBluetoothArduino = function(opt){
    $.extend(true, this, opt);
    this.start();
};

NodoAdaptadorBluetoothArduino.prototype.start = function(){
    this.portal = new NodoPortalBidi();
    var _this = this;
    this.conectorBluetooth = new NodoConectorBluetooth({  mac: _this.mac,
        alConectar:function(){
            _this.alConectar();
        },
        onErrorAlConectar:function(){
            _this.onErrorAlConectar();
        }
    });
    
    this.conectorBluetooth.conectarCon({
        recibirMensaje:function(mensaje){
            _this.portal.enviarMensaje(mensaje);         
        }
    });
    
    this.portal.pedirMensajes(  new FiltroTrue(),
                                function(mensaje){
                                    _this.conectorBluetooth.recibirMensaje(mensaje);
                                });
};

NodoAdaptadorBluetoothArduino.prototype.conectarCon = function(otro_nodo){
    this.portal.conectarCon(otro_nodo);
};

NodoAdaptadorBluetoothArduino.prototype.recibirMensaje = function(un_mensaje){
    this.portal.recibirMensaje(un_mensaje);
};