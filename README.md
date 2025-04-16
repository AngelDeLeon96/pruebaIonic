# Billetera Digital Neobank

## Descripción
Billetera Digital es una aplicación móvil desarrollada con Ionic/Angular que permite a los usuarios gestionar sus cuentas bancarias, realizar transferencias y consultar el historial de transacciones. Está diseñada para proporcionar una experiencia de usuario intuitiva y eficiente para la gestión financiera personal. Como adicion, permite comprar criptomonedas utilizando el saldo disponible en las cuentas.

## Características principales

- **Gestión de Cuentas**: Visualización de cuentas bancarias con detalles como número de cuenta y saldo disponible.
- **Transferencias**: Realizar transferencias entre cuentas y consultar el historial de transacciones.
- **Criptomonedas**: Permite visualizar y comprar criptomonedas usando el saldo de las cuentas disponibles.

## Tecnologías utilizadas

- **Ionic Framework**: Framework para el desarrollo de aplicaciones móviles híbridas
- **Angular**: Framework para el desarrollo frontend
- **TypeScript**: Lenguaje de programación principal
- **Capacitor**: Para convertir la aplicación web en una aplicación móvil nativa
- **HTML/SCSS**: Para la estructura y estilos de la interfaz de usuario
- **Realtime Database Firebase**: Para el manejo de datos.

## Estructura del proyecto

La aplicación está organizada en una estructura de pestañas (tabs):

- **Tab1 (Cuentas)**: Muestra el listado de cuentas disponibles del usuario con su saldo.
- **Tab2 (Transferencias)**: Muestra el historial de transferencias realizadas.
- **Tab3 (Bienvenida)**: Sección inicial.
- **Tab4 (Criptomonedas)**: Sección donde se pueden comprar criptomonedas.

## Requisitos previos

- Node.js (v14 o superior)
- npm (v6 o superior)
- Ionic CLI (`npm install -g @ionic/cli`)
- Angular CLI (`npm install -g @angular/cli`)

## Instalación

1. Clonar el repositorio
```bash
git clone [URL_DEL_REPOSITORIO]
cd billetera-digital
```

2. Instalar dependencias
```bash
npm install
```

3. Ejecutar en modo desarrollo
```bash
ionic serve
o 
ng serve
```
4. Para ejecutar la aplicacion y ver su funcionamiento
```bash
ng serve
Se desplegara la aplicación en la url: localhost:4200 (ver la consola)
```

## Compilación para producción

Para compilar la aplicación para producción:

```bash
ionic build --prod
```


## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
