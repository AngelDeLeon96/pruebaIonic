import { Component, OnInit, OnDestroy } from '@angular/core';
import { InfiniteScrollCustomEvent, AlertController, ToastController, AlertInput } from '@ionic/angular';
import { DataService, Cuenta, Transaccion } from '../services/data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  // Array para almacenar las cuentas
  public cuentas: Cuenta[] = [];
  // Control del segmento actual
  public segmentoActual: string = 'cuentas';

  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private dataService: DataService
  ) { }

  ngOnInit() {
    // Suscribirse al observable de cuentas
    this.subscriptions.add(
      this.dataService.cuentas$.subscribe(cuentas => {
        this.cuentas = cuentas;
      })
    );
  }

  ngOnDestroy() {
    // Limpieza de suscripciones al destruir el componente
    this.subscriptions.unsubscribe();
  }

  // Manejar el cambio de segmento (cuentas/transacciones)
  segmentChanged(event: any) {
    this.segmentoActual = event.detail.value;
  }

  onIonInfinite(event: Event) {
    // Convertir el evento a InfiniteScrollCustomEvent
    const infiniteScrollEvent = event as InfiniteScrollCustomEvent;
    setTimeout(() => {
      infiniteScrollEvent.target.complete();
    }, 500);
  }

  // Método para mostrar el formulario de transferencia
  async mostrarFormularioTransferencia() {
    // Crear las opciones para el selector de cuentas destino
    const inputs: AlertInput[] = this.cuentas.map(cuenta => ({
      type: 'radio',
      label: `${cuenta.nombre} (${cuenta.numeroCuenta})`,
      value: cuenta.numeroCuenta,
    }));

    // Primero, mostrar un alert para seleccionar la cuenta origen
    const alertOrigen = await this.alertController.create({
      header: 'Selecciona cuenta origen',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          handler: (cuentaOrigenId) => {
            this.seleccionarCuentaDestino(cuentaOrigenId);
          }
        }
      ]
    });

    await alertOrigen.present();
  }

  // Método para seleccionar la cuenta destino
  async seleccionarCuentaDestino(cuentaOrigenId: string) {
    // Filtrar las cuentas para no mostrar la cuenta origen
    const cuentasDestino: AlertInput[] = this.cuentas
      .filter(c => c.numeroCuenta !== cuentaOrigenId)
      .map(cuenta => ({
        type: 'radio',
        label: `${cuenta.nombre} (${cuenta.numeroCuenta})`,
        value: cuenta.numeroCuenta,
      }));

    if (cuentasDestino.length === 0) {
      const toast = await this.toastController.create({
        message: 'No hay otras cuentas disponibles para transferir',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const alertDestino = await this.alertController.create({
      header: 'Selecciona cuenta destino',
      inputs: cuentasDestino,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          handler: (cuentaDestinoId) => {
            this.ingresarMonto(cuentaOrigenId, cuentaDestinoId);
          }
        }
      ]
    });

    await alertDestino.present();
  }

  // Método para ingresar el monto a transferir
  async ingresarMonto(cuentaOrigenId: string, cuentaDestinoId: string) {
    const cuentaOrigen = this.cuentas.find(c => c.numeroCuenta === cuentaOrigenId)!;

    const alert = await this.alertController.create({
      header: 'Ingresa el monto',
      subHeader: `Saldo disponible: $${cuentaOrigen.saldoDisponible.toFixed(2)}`,
      inputs: [
        {
          name: 'monto',
          type: 'number',
          placeholder: 'Monto a transferir',
          min: 0.01,
          max: cuentaOrigen.saldoDisponible
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Transferir',
          handler: (data) => {
            const monto = parseFloat(data.monto);
            if (!monto || monto <= 0 || monto > cuentaOrigen.saldoDisponible) {
              this.mostrarError('Monto inválido. Debe ser mayor a 0 y no exceder tu saldo disponible.');
              return false;
            }
            this.realizarTransferencia(cuentaOrigenId, cuentaDestinoId, monto);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // Método para mostrar mensajes de error
  async mostrarError(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: 'danger'
    });
    toast.present();
  }

  // Método para realizar la transferencia
  async realizarTransferencia(cuentaOrigenId: string, cuentaDestinoId: string, monto: number) {
    // Usar el servicio para realizar la transferencia
    const resultado = this.dataService.realizarTransferencia(cuentaOrigenId, cuentaDestinoId, monto);

    if (resultado) {
      // Mostrar confirmación
      const toast = await this.toastController.create({
        message: `Transferencia realizada con éxito. Monto: $${monto.toFixed(2)}`,
        duration: 3000,
        color: 'success'
      });
      toast.present();
    } else {
      this.mostrarError('No se pudo realizar la transferencia. Verifica los datos e intenta nuevamente.');
    }
  }
}
