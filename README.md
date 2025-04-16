# Billetera Digital

## Descripción
Billetera Digital es una aplicación móvil desarrollada con Ionic/Angular que permite a los usuarios gestionar sus cuentas bancarias, realizar transferencias y consultar el historial de transacciones. Está diseñada para proporcionar una experiencia de usuario intuitiva y eficiente para la gestión financiera personal.

## Características principales

- **Gestión de Cuentas**: Visualización de cuentas bancarias con detalles como número de cuenta y saldo disponible.
- **Transferencias**: Realizar transferencias entre cuentas y consultar el historial de transacciones.
- **Perfil de Usuario**: Acceso a información del perfil y configuraciones personales.

## Tecnologías utilizadas

- **Ionic Framework**: Framework para el desarrollo de aplicaciones móviles híbridas
- **Angular**: Framework para el desarrollo frontend
- **TypeScript**: Lenguaje de programación principal
- **Capacitor**: Para convertir la aplicación web en una aplicación móvil nativa
- **HTML/SCSS**: Para la estructura y estilos de la interfaz de usuario

## Estructura del proyecto

La aplicación está organizada en una estructura de pestañas (tabs):

- **Tab1 (Cuentas)**: Muestra el listado de cuentas disponibles del usuario con su saldo.
- **Tab2 (Transferencias)**: Muestra el historial de transferencias realizadas.
- **Tab3 (Perfil)**: Sección para gestionar el perfil del usuario.

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
ionic serve o 
ng serve
```

## Compilación para producción

Para compilar la aplicación para producción:

```bash
ionic build --prod
```

## Generación de aplicaciones nativas

### Android
```bash
ionic capacitor add android
ionic capacitor copy android
```

### iOS
```bash
ionic capacitor add ios
ionic capacitor copy ios
```

## Contribuir

1. Hacer fork del repositorio
2. Crear una rama para tu nueva característica (`git checkout -b feature/nueva-caracteristica`)
3. Hacer commit de tus cambios (`git commit -m 'Añadir nueva característica'`)
4. Hacer push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abrir un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
