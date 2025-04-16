import { Component, OnInit } from '@angular/core';
import { CriptoService, MyCriptos, CompraResponse } from '../services/cripto.service';
import {
  Cuenta, DataService
} from '../services/data.service';
import { ToastController, LoadingController, AlertController, AlertInput } from '@ionic/angular';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {
  // Lista de criptomonedas disponibles para comprar
  criptomonedas: MyCriptos[] = [];
  criptosUsuario: MyCriptos[] = [];
  public cuentas: Cuenta[] = [];
  public cuentasUsuario: Cuenta[] = [];
  // Control del segmento actual
  public segmentoActual: string = 'cuentas';
  // Cuentas del usuario para seleccionar de dónde comprar

  // Variables para el proceso de compra
  criptoSeleccionada: MyCriptos | null = null;
  cantidadCripto: number = 0;
  montoUSD: number = 0;
  cuentaSeleccionadaId: string = '';

  constructor(
    private criptoService: CriptoService,
    private dataService: DataService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    // Cargar datos iniciales
    this.cargarCriptomonedas();
    this.cargarCuentas();
  }

  // Método para cargar la lista de criptomonedas disponibles
  cargarCriptomonedas() {
    // Suscribirse a las criptomonedas generales
    this.criptoService.criptos$.subscribe(criptos => {
      // Criptomonedas generales disponibles para comprar
      this.criptomonedas = criptos.map(cripto => ({
        ...cripto,
        monto: 0 // Inicialmente sin monto, ya que son las disponibles para comprar
      }));
    });

    // Suscribirse a las criptomonedas del usuario
    this.criptoService.myCriptos$.subscribe(misCriptos => {
      // Las criptomonedas que ya tiene el usuario
      this.criptosUsuario = misCriptos.filter(cripto => cripto.monto > 0);

      // Actualizar los montos en la lista general
      if (this.criptomonedas.length > 0 && misCriptos.length > 0) {
        this.criptomonedas = this.criptomonedas.map(cripto => {
          const miCripto = misCriptos.find(mc => mc.id === cripto.id);
          return {
            ...cripto,
            monto: miCripto ? miCripto.monto : 0
          };
        });
      }
    });
  }

  // Método para cargar las cuentas del usuario
  cargarCuentas() {
    this.dataService.cuentas$.subscribe(cuentas => {
      this.cuentasUsuario = cuentas;
      console.log('Cuentas del usuario:', this.cuentasUsuario);
    });
  }

  // Abrir el modal de compra para una criptomoneda específica
  async abrirModalCompra(cripto: MyCriptos) {
    this.criptoSeleccionada = cripto;
    this.cantidadCripto = 0;
    this.montoUSD = 0;

    // Crear las opciones para el selector de cuentas
    const inputs: AlertInput[] = this.cuentasUsuario.map(cuenta => ({
      type: 'radio',
      label: `${cuenta.nombre} - $${cuenta.saldoDisponible.toFixed(2)}`,
      value: cuenta.uid, // Usar uid en lugar de numeroCuenta
    }));

    if (inputs.length === 0) {
      this.mostrarToast('No tienes cuentas disponibles para comprar.', 'warning');
      return;
    }

    // Mostrar alert para seleccionar la cuenta
    const alertCuenta = await this.alertController.create({
      header: `Comprar ${cripto.name} (${cripto.symbol})`,
      subHeader: 'Selecciona la cuenta para hacer la compra',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          handler: (cuentaId) => {
            if (!cuentaId) {
              this.mostrarToast('Por favor, selecciona una cuenta.', 'warning');
              return false;
            }
            this.cuentaSeleccionadaId = cuentaId;
            // Pasar al siguiente paso: ingresar cantidad
            this.ingresarCantidadCripto(cripto, cuentaId);
            return true;
          }
        }
      ]
    });

    await alertCuenta.present();
  }

  // Método para ingresar la cantidad de criptomoneda a comprar
  async ingresarCantidadCripto(cripto: MyCriptos, cuentaId: string) {
    // Obtener la cuenta seleccionada
    const cuentaSeleccionada = this.cuentasUsuario.find(c => c.uid === cuentaId);

    if (!cuentaSeleccionada) {
      this.mostrarToast('Cuenta no encontrada.', 'danger');
      return;
    }

    // Calcular la cantidad máxima que puede comprar con el saldo disponible
    const maxCompra = cuentaSeleccionada.saldoDisponible / cripto.price;

    const alertCantidad = await this.alertController.create({
      header: `Comprar ${cripto.name} (${cripto.symbol})`,
      subHeader: `Precio actual: $${cripto.price.toFixed(2)} USD | Saldo: $${cuentaSeleccionada.saldoDisponible.toFixed(2)}`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: `Cantidad (máx. ${maxCompra.toFixed(6)} ${cripto.symbol})`,
          min: 0.00001,
          max: maxCompra
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Comprar',
          handler: (data) => {
            const cantidad = parseFloat(data.cantidad);
            if (!cantidad || cantidad <= 0) {
              this.mostrarToast('Por favor, ingresa una cantidad válida.', 'warning');
              return false;
            }

            const montoUSD = cantidad * cripto.price;
            if (montoUSD > cuentaSeleccionada.saldoDisponible) {
              this.mostrarToast('Saldo insuficiente para realizar esta compra.', 'danger');
              return false;
            }

            this.cantidadCripto = cantidad;
            this.montoUSD = montoUSD;

            // Ejecutar la compra
            this.ejecutarCompra(cripto, cuentaId, cantidad);
            return true;
          }
        }
      ]
    });

    await alertCantidad.present();
  }

  // Método para ejecutar la compra y enviarla a Firebase
  async ejecutarCompra(cripto: MyCriptos, cuentaId: string, cantidad: number) {
    // Mostrar cargador
    const loading = await this.loadingController.create({
      message: 'Procesando tu compra...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      // Realizar la compra utilizando el servicio
      const resultado = await this.criptoService.comprarCripto(
        cuentaId,
        cripto.id,
        cantidad
      );

      loading.dismiss();

      if (resultado.success) {
        this.mostrarToast(resultado.message || `Has comprado ${cantidad} ${cripto.symbol} exitosamente.`, 'success');
        // Recargar datos
        this.cargarCriptomonedas();
        this.cargarCuentas();
      } else {
        this.mostrarToast(resultado.message || 'Error al procesar la compra.', 'danger');
      }
    } catch (error) {
      loading.dismiss();
      this.mostrarToast('Error al procesar la compra. Intenta más tarde.', 'danger');
      console.error('Error en compra:', error);
    }
  }

  // Método para vender criptomonedas
  async venderCriptomoneda(cripto: MyCriptos) {
    if (cripto.monto <= 0) {
      this.mostrarToast('No tienes esta criptomoneda para vender.', 'warning');
      return;
    }

    // Crear las opciones para el selector de cuentas
    const inputs: AlertInput[] = this.cuentasUsuario.map(cuenta => ({
      type: 'radio',
      label: `${cuenta.nombre} - $${cuenta.saldoDisponible.toFixed(2)}`,
      value: cuenta.uid,
    }));

    if (inputs.length === 0) {
      this.mostrarToast('No tienes cuentas disponibles para recibir el dinero.', 'warning');
      return;
    }

    // Mostrar alert para seleccionar la cuenta
    const alertCuenta = await this.alertController.create({
      header: `Vender ${cripto.name} (${cripto.symbol})`,
      subHeader: `Tienes ${cripto.monto} ${cripto.symbol} disponibles`,
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          handler: (cuentaId) => {
            if (!cuentaId) {
              this.mostrarToast('Por favor, selecciona una cuenta.', 'warning');
              return false;
            }
            // Pasar al siguiente paso: ingresar cantidad
            this.ingresarCantidadVenta(cripto, cuentaId);
            return true;
          }
        }
      ]
    });

    await alertCuenta.present();
  }

  // Método para ingresar la cantidad de criptomoneda a vender
  async ingresarCantidadVenta(cripto: MyCriptos, cuentaId: string) {
    const alertCantidad = await this.alertController.create({
      header: `Vender ${cripto.name} (${cripto.symbol})`,
      subHeader: `Precio actual: $${cripto.price.toFixed(2)} USD | Disponible: ${cripto.monto} ${cripto.symbol}`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: `Cantidad (máx. ${cripto.monto} ${cripto.symbol})`,
          min: 0.00001,
          max: cripto.monto
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Vender',
          handler: (data) => {
            const cantidad = parseFloat(data.cantidad);
            if (!cantidad || cantidad <= 0 || cantidad > cripto.monto) {
              this.mostrarToast('Cantidad inválida.', 'warning');
              return false;
            }

            // Ejecutar la venta
            this.ejecutarVenta(cripto, cuentaId, cantidad);
            return true;
          }
        }
      ]
    });

    await alertCantidad.present();
  }

  // Método para ejecutar la venta y enviarla a Firebase
  async ejecutarVenta(cripto: MyCriptos, cuentaId: string, cantidad: number) {
    // Mostrar cargador
    const loading = await this.loadingController.create({
      message: 'Procesando tu venta...',
      spinner: 'circular'
    });
    await loading.present();

    try {
      // Realizar la venta utilizando el servicio
      const resultado = await this.criptoService.venderCripto(
        cuentaId,
        cripto.id,
        cantidad
      );

      loading.dismiss();

      if (resultado.success) {
        this.mostrarToast(resultado.message || `Has vendido ${cantidad} ${cripto.symbol} exitosamente.`, 'success');
        // Recargar datos
        this.cargarCriptomonedas();
        this.cargarCuentas();
      } else {
        this.mostrarToast(resultado.message || 'Error al procesar la venta.', 'danger');
      }
    } catch (error) {
      loading.dismiss();
      this.mostrarToast('Error al procesar la venta. Intenta más tarde.', 'danger');
      console.error('Error en venta:', error);
    }
  }

  // Mostrar toast de notificación
  async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  // Obtener la URL de imagen para una criptomoneda
  getImageUrl(symbol: string): string {
    const symbolLower = symbol.toLowerCase();
    const iconMapping: { [key: string]: string } = {
      'btc': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      'eth': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      'bnb': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
      'sol': 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
    };

    return iconMapping[symbolLower] || 'assets/icon/favicon.png';
  }
}
