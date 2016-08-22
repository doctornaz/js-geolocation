var app = angular.module('messagingApp', [ ]);

//Listener para disparar eventos cuando se hagan llamadas $http
app.factory('httpConfig', ['$http', '$rootScope', function($http, $rootScope) {
    $http.defaults.transformRequest.push(function (data) {
        $rootScope.$broadcast('httpCallStarted');
        return data;
    });
    $http.defaults.transformResponse.push(function(data){
        $rootScope.$broadcast('httpCallStopped');
        return data;
    });
    return $http;
}]);

app.controller('usersCtrl', function ($scope, httpConfig) {
	$scope.gente = [];

    //Eventos para deshabilitar todos los campos mientras se ejecuta .
    var elements = $("#personId, #personName, #personLastName, #personBirthday, #personDir, #buttonDir");

    //region Eventos al llamar $http (post y get)
    $scope.$on('httpCallStarted', function(e) {
            elements.attr("disabled", "disabled");
    });
    $scope.$on('httpCallStopped', function(e) {
            elements.removeAttr("disabled");
    });
    //endregion

    //Registrar persona
	$scope.registrarPersona = function registrarPersona() {
        var valid = true;
        var fecha = new Date($('#personBirthday').val());
        var opcionesFormato = { year: 'numeric', month: 'long', day: 'numeric' };
		var persona = {
            apellidos: $('#personLastName').val(),
            cedula: $('#personId').val(),
            direccion: $('#personDir').val(),
            //fecha_nacimiento: new Date(fecha.getTime() + fecha.getTimezoneOffset()*60000).toLocaleDateString(),
            fecha_nacimiento: fecha.toLocaleDateString('es-VE', opcionesFormato),
            nombres: $('#personName').val()
            };

        //region Validaciones (Si se rellenaron todos los campos y si ya existe)
        //VALIDACION 1: Se rellenaron todos los campos?
        for(var propiedad in persona){
            //Si alguna de las propiedades de persona es vacia o nula...
            if(persona[propiedad] == null || persona[propiedad] == ''){
                alert("Por favor rellenar todos los campos.");
                valid = false;
                return;
            }
        }
        if(!valid) return;

        //VALIDACION 2: Ya esta registrado? / La cedula es valida?
        $.each($scope.gente, function( i, per ) {
            if(per.cedula == persona.cedula){
                alert("La persona ya se encuentra registrada.");
                $scope.limpiarCampos();
                valid = false;
                return;
            }
            if(isNaN(persona.cedula)){
                alert("La cedula introducida no es valida.");
                $('#personId').val('');
                valid = false;
                return false;
            }
        });
        if(!valid) return;
        //endregion

        $scope.gente.push(persona);

        //Enviar persona
        httpConfig({
            method: 'POST',
            url: 'https://glacial-eyrie-58697.herokuapp.com',
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'},
            data: $.param(persona)
        })
            .success(function(data,status){
                if(status == 200) console.info("Mensaje enviado con Exito.");
            $scope.limpiarCampos();
        })
            .error(function(data,status,headers,config){
                alert("Hubo un error al enviar los datos. Revisar consola.");
                console.error(data);
                console.error(status);
                console.error(headers);
                console.error(config);
            });
	};

    //Obtener ubicacion de la personas
	$scope.obtenerUbicacion = function obtenerUbicacion(){
		// Intentar Geolocalizacion
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
                //Dialogo de Informacion
                var info = new google.maps.InfoWindow({map: map});
                var geocoder = new google.maps.Geocoder;

                //Posicion de la Geolocalizacion
                var pos = {
					lat: position.coords.latitude, //Latitud
					lng: position.coords.longitude //Longitudd
				};

                //Utilizar Geocode para descifrar las coordenadas y obtener la direccion.
                geocoder.geocode({'location': pos}, function(results, status) {
                    if (status === 'OK') {
                        if (results[1]) {
                            map.setZoom(11);
                            var marker = new google.maps.Marker({
                                position: pos,
                                map: map
                            });
                            $('#personDir').val(results[1].formatted_address);
                            info.setContent(results[1].formatted_address);
                            info.open(map, marker);
                            info.setPosition(pos);
                            map.setCenter(pos);
                        } else {
                            window.alert('No se encontraron resultados');
                        }
                    } else {
                        alert('La geolocalizacion fallo debido a: ' + status);
                    }
                });
			}, function() {
				manejarError(true, info, map.getCenter());
			});
		}
        else {
			manejarError(false, info, map.getCenter());
		}

		function manejarError(browserHasGeolocation, infoWindow, pos) {
			infoWindow.setPosition(pos);
			infoWindow.setContent(browserHasGeolocation ?
				'Error: El Servicio de Geolocalizacion Fallo.' :
				'Error: Su browser no soporta Geolocalizacion.');
		}
	};

    //Cargar la ultima persona y luego la data
    $(document).ready(function documentIsReady() {
        $scope.cargarUltimo();

        httpConfig.get("https://glacial-eyrie-58697.herokuapp.com", $scope.gente)
            .success(function(data){
                data.forEach(function dataForEach(p) {
                    var persona = {
                        cedula: p.cedula,
                        nombres: p.nombres,
                        apellidos: p.apellidos,
                        fecha_nacimiento: p.fecha_nacimiento,
                        direccion: p.direccion
                    };
                    $scope.gente.push(persona);
                });
            })
            .error(function(data,status,headers,config){
                console.error(data);
                console.error(status);
                console.error(headers);
                console.error(config);
            });
    });

    //Refrescar Usuarios
    setInterval(function(){
        $scope.gente.length = 0;

        //Realizar la llamada al endpoint, obtener data e introducirla en la tabla.
        httpConfig.get("https://glacial-eyrie-58697.herokuapp.com", $scope.gente)
            .success(function(data){
                data.forEach(function dataForEach(p) {
                    var persona = {
                        cedula: p.cedula,
                        nombres: p.nombres,
                        apellidos: p.apellidos,
                        fecha_nacimiento: p.fecha_nacimiento,
                        direccion: p.direccion
                    };
                    $scope.gente.push(persona);
                });
            })
            .error(function(data,status,headers,config){
                console.error(data);
                console.error(status);
                console.error(headers);
                console.error(config);
            });
    }, 30000);

    //Limpiar los Textfields.
    $scope.limpiarCampos = function limpiarCampos() {
        $('#personId').val('');
        $('#personName').val('');
        $('#personLastName').val('');
        $('#personBirthday').val('');
        $('#personDir').val('');
    };

    //Cargar la persona del local storage
    $scope.cargarUltimo = function cargarUltimo(){
        $('#personId').val(localStorage.id);
        $('#personName').val(localStorage.name);
        $('#personLastName').val(localStorage.lastname);
        $('#personBirthday').val(localStorage.birthday);
        $('#personDir').val(localStorage.dir);
    };

    //Guardar la persona en el local storage
    $scope.guardarPersona = function guardarPersona(){
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem("id", $('#personId').val());
            localStorage.setItem("name", $('#personName').val());
            localStorage.setItem("lastname", $('#personLastName').val());
            localStorage.setItem("birthday", $('#personBirthday').val());
            localStorage.setItem("dir", $('#personDir').val());
        } else { //El browser no soporta localstorage.
            alert("Su browser no soporta almacenamiento local.");
        }
    };
    
});


