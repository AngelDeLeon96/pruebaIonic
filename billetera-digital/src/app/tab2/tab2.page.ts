import { Component, OnInit, OnDestroy } from '@angular/core';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { DataService, Transaccion } from '../services/data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  // Array para almacenar las transacciones
  public transacciones: Transaccion[] = [];

  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(private dataService: DataService) { }

  ngOnInit() {
    // Suscribirse al observable de transacciones
    this.subscriptions.add(
      this.dataService.transacciones$.subscribe(transacciones => {
        this.transacciones = transacciones;
      })
    );
  }

  ngOnDestroy() {
    // Limpieza de suscripciones al destruir el componente
    this.subscriptions.unsubscribe();
  }

  // Obtener el nombre de la cuenta por su ID
  obtenerNombreCuenta(numeroCuenta: string): string {
    return this.dataService.obtenerNombreCuenta(numeroCuenta);
  }

  // Obtener el ícono según el tipo de transacción
  obtenerIconoTransaccion(tipo: string): string {
    switch (tipo) {
      case 'transferencia':
        return 'swap-horizontal-outline';
      case 'deposito':
        return 'arrow-down-outline';
      case 'retiro':
        return 'arrow-up-outline';
      default:
        return 'cash-outline';
    }
  }

  // Obtener el título según el tipo de transacción
  obtenerTituloTransaccion(tipo: string): string {
    switch (tipo) {
      case 'transferencia':
        return 'Transferencia';
      case 'deposito':
        return 'Depósito';
      case 'retiro':
        return 'Retiro';
      default:
        return 'Transacción';
    }
  }

  onIonInfinite(event: Event) {
    // Convertir el evento a InfiniteScrollCustomEvent
    const infiniteScrollEvent = event as InfiniteScrollCustomEvent;
    setTimeout(() => {
      infiniteScrollEvent.target.complete();
    }, 500);
  }
}
