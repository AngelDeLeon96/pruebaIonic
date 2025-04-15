import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Definición de la interfaz para las cuentas
export interface Cuenta {
    numeroCuenta: string;
    saldoDisponible: number;
    nombre: string;
}

// Definición de la interfaz para las transacciones
export interface Transaccion {
    id: string;
    fecha: Date;
    cuentaOrigen: string;
    cuentaDestino: string;
    monto: number;
    tipo: 'transferencia' | 'deposito' | 'retiro';
}

@Injectable({
    providedIn: 'root'
})
export class DataService {
    // BehaviorSubjects para las cuentas y transacciones
    private cuentasSubject = new BehaviorSubject<Cuenta[]>([]);
    private transaccionesSubject = new BehaviorSubject<Transaccion[]>([]);

    // Observables que los componentes pueden suscribirse
    public cuentas$: Observable<Cuenta[]> = this.cuentasSubject.asObservable();
    public transacciones$: Observable<Transaccion[]> = this.transaccionesSubject.asObservable();

    constructor() {
        // Inicializar con datos de ejemplo
        this.initDatosEjemplo();
    }

    private initDatosEjemplo() {
        // Datos de ejemplo para cuentas
        const cuentasIniciales = [
            { numeroCuenta: '1234-5678-9012-3456', saldoDisponible: 2500.75, nombre: 'Cuenta Principal' },
            { numeroCuenta: '9876-5432-1098-7654', saldoDisponible: 1200.50, nombre: 'Cuenta de Ahorros' },
            { numeroCuenta: '4567-8901-2345-6789', saldoDisponible: 500.25, nombre: 'Cuenta Compartida' },
        ];
        this.cuentasSubject.next(cuentasIniciales);

        // Inicializar transacciones con un array vacío
        this.transaccionesSubject.next([]);
    }

    // Métodos para obtener datos actuales
    getCuentas(): Cuenta[] {
        return this.cuentasSubject.value;
    }

    getTransacciones(): Transaccion[] {
        return this.transaccionesSubject.value;
    }

    // Método para realizar una transferencia
    realizarTransferencia(cuentaOrigenId: string, cuentaDestinoId: string, monto: number): boolean {
        const cuentas = this.getCuentas();
        const cuentaOrigen = cuentas.find(c => c.numeroCuenta === cuentaOrigenId);
        const cuentaDestino = cuentas.find(c => c.numeroCuenta === cuentaDestinoId);

        if (!cuentaOrigen || !cuentaDestino || monto <= 0 || monto > cuentaOrigen.saldoDisponible) {
            return false;
        }

        // Actualizar saldos
        cuentaOrigen.saldoDisponible -= monto;
        cuentaDestino.saldoDisponible += monto;
        this.cuentasSubject.next([...cuentas]); // Emitir actualización

        // Crear nueva transacción
        const nuevaTransaccion: Transaccion = {
            id: Date.now().toString(),
            fecha: new Date(),
            cuentaOrigen: cuentaOrigenId,
            cuentaDestino: cuentaDestinoId,
            monto: monto,
            tipo: 'transferencia'
        };

        // Actualizar transacciones
        const transacciones = this.getTransacciones();
        this.transaccionesSubject.next([nuevaTransaccion, ...transacciones]); // Añadir al inicio para que se muestre primero

        return true;
    }

    // Obtener el nombre de la cuenta por su ID
    obtenerNombreCuenta(numeroCuenta: string): string {
        const cuenta = this.getCuentas().find(c => c.numeroCuenta === numeroCuenta);
        return cuenta ? cuenta.nombre : 'Cuenta Desconocida';
    }
}