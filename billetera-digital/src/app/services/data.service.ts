import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Database, ref, set, push, onValue, get, update, child } from '@angular/fire/database';

// Definición de la interfaz para las cuentas
export interface Cuenta {
    numeroCuenta: number
    saldoDisponible: number;
    nombre: string;
    uid: string;
    tipo: string;
}
export interface CuentaConUID {
    uid: string;
}
// Definición de la interfaz para las transacciones
export interface Transaccion {
    id: string;
    fecha: Date;
    cuentaDestino: number;
    cuentaOrigen: number;
    monto: number;
    tipo: string;
}

@Injectable({
    providedIn: 'root'
})
export class DataService {
    // BehaviorSubjects para las cuentas y transacciones
    private cuentasSubject = new BehaviorSubject<Cuenta[]>([]);
    private transaccionesSubject = new BehaviorSubject<Transaccion[]>([]);
    private cuentasConUIDSubject = new BehaviorSubject<CuentaConUID[]>([]);

    // Observables que los componentes pueden suscribirse
    public cuentas$: Observable<Cuenta[]> = this.cuentasSubject.asObservable();
    public transacciones$: Observable<Transaccion[]> = this.transaccionesSubject.asObservable();
    public cuentasConUID$: Observable<CuentaConUID[]> = this.cuentasConUIDSubject.asObservable();

    constructor(private database: Database) {
        // Inicializar y cargar datos desde Firebase
        this.cargarDatosDesdeFirebase();
        this.cargarTransaccionesDesdeFirebase();
        this.getCuentasWithUID();
    }

    private cargarDatosDesdeFirebase() {
        // Referencia a cuentas en Firebase
        const cuentasRef = ref(this.database, 'cuentas');

        // Escuchar cambios en las cuentas
        onValue(cuentasRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                // Procesar los datos donde cada cuenta tiene su propio ID como nodo
                const cuentasArray = Object.keys(data).map(key => ({
                    ...data[key],
                    uid: key // El ID del nodo se guarda como uid, no como numeroCuenta
                }));

                this.cuentasSubject.next(cuentasArray);
            }
            else {
                this.cuentasSubject.next([]);

            }
        });
    }

    private cargarTransaccionesDesdeFirebase() {
        // Referencia a transacciones en Firebase
        const transaccionesRef = ref(this.database, 'transacciones');

        // Escuchar cambios en las transacciones
        onValue(transaccionesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const transaccionesArray = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key,
                    fecha: new Date(data[key].fecha)
                }));

                // Ordenar transacciones por fecha (más recientes primero)
                transaccionesArray.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
                this.transaccionesSubject.next(transaccionesArray);
            } else {
                this.transaccionesSubject.next([]);
            }
        });
    }

    private getCuentasWithUID() {
        const cuentasRef = ref(this.database, 'indice_cuentas');
        onValue(cuentasRef, (snapshot) => {
            const data = snapshot.val();
        })
    }

    // Métodos para obtener datos actuales
    getCuentas(): Cuenta[] {
        return this.cuentasSubject.value;
    }

    getTransacciones(): Transaccion[] {
        return this.transaccionesSubject.value;
    }

    getCuentasConUID(): CuentaConUID[] {
        return this.getCuentas().map(cuenta => ({ uid: cuenta.uid }));
    }

    // Método para realizar una transferencia
    realizarTransferencia(cuentaOrigenUID1: number, cuentaDestinoUID1: number, monto: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const cuentas = this.getCuentas();

            const cuentaOrigen = cuentas.find(c => c.numeroCuenta === cuentaOrigenUID1);
            const cuentaDestino = cuentas.find(c => c.numeroCuenta === cuentaDestinoUID1);

            if (!cuentaOrigen || !cuentaDestino || monto <= 0 || monto > cuentaOrigen.saldoDisponible) {
                resolve(false);
                return;
            }

            // Actualizar saldos en Firebase
            const nuevoSaldoOrigen = cuentaOrigen.saldoDisponible - monto;
            const nuevoSaldoDestino = cuentaDestino.saldoDisponible + monto;

            const updates: any = {};
            updates[`cuentas/${cuentaOrigen.uid}/saldoDisponible`] = nuevoSaldoOrigen;
            updates[`cuentas/${cuentaDestino.uid}/saldoDisponible`] = nuevoSaldoDestino;

            // Crear nueva transacción
            const nuevaTransaccion: Omit<Transaccion, 'id'> = {
                fecha: new Date(),
                cuentaDestino: cuentaDestino.numeroCuenta,
                cuentaOrigen: cuentaOrigen.numeroCuenta,
                monto: monto,
                tipo: 'transferencia'
            };

            // Guardar transacción en Firebase
            const transaccionesRef = ref(this.database, 'transacciones');
            const newTransaccionRef = push(transaccionesRef);

            // Agregar la transacción al objeto de actualizaciones
            updates[`transacciones/${newTransaccionRef.key}`] = {
                ...nuevaTransaccion,
                fecha: nuevaTransaccion.fecha.toISOString() // Convertir fecha a string para almacenar en Firebase
            };

            // Actualizar todo en una sola operación (transacción atómica)
            update(ref(this.database), updates)
                .then(() => resolve(true))
                .catch(error => {
                    console.error('Error al realizar transferencia:', error);
                    reject(error);
                });
        });
    }

    // Método para realizar un depósito
    realizarDeposito(cuentaId: string, monto: number, numeroCuenta: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!cuentaId || monto <= 0) {
                resolve(false);
                return;
            }

            // Obtener cuenta actual
            const cuentas = this.getCuentas();
            const cuenta = cuentas.find(c => c.numeroCuenta === numeroCuenta);

            if (!cuenta) {
                resolve(false);
                return;
            }

            // Nuevo saldoDisponible
            const nuevoSaldo = cuenta.saldoDisponible + monto;

            // Actualizar en Firebase
            const updates: any = {};
            updates[`cuentas/${cuentaId}/saldoDisponible`] = nuevoSaldo;

            // Crear nueva transacción
            const nuevaTransaccion: Omit<Transaccion, 'id'> = {
                fecha: new Date(),
                cuentaOrigen: cuenta.numeroCuenta,
                cuentaDestino: cuenta.numeroCuenta,
                monto: monto,
                tipo: 'deposito'
            };

            // Guardar transacción en Firebase
            const transaccionesRef = ref(this.database, 'transacciones');
            const newTransaccionRef = push(transaccionesRef);

            // Agregar la transacción al objeto de actualizaciones
            updates[`transacciones/${newTransaccionRef.key}`] = {
                ...nuevaTransaccion,
                fecha: nuevaTransaccion.fecha.toISOString()
            };

            // Actualizar todo en una sola operación
            update(ref(this.database), updates)
                .then(() => resolve(true))
                .catch(error => {
                    console.error('Error al realizar depósito:', error);
                    reject(error);
                });
        });
    }

    // Método para realizar un retiro
    realizarRetiro(cuentaId: string, monto: number, numeroCuenta: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!cuentaId || monto <= 0) {
                resolve(false);
                return;
            }

            // Obtener cuenta actual
            const cuentas = this.getCuentas();
            const cuenta = cuentas.find(c => c.numeroCuenta === numeroCuenta);

            if (!cuenta || monto > cuenta.saldoDisponible) {
                resolve(false);
                return;
            }

            // Nuevo saldoDisponible
            const nuevoSaldo = cuenta.saldoDisponible - monto;

            // Actualizar en Firebase
            const updates: any = {};
            updates[`cuentas/${cuentaId}/saldoDisponible`] = nuevoSaldo;

            // Crear nueva transacción
            const nuevaTransaccion: Omit<Transaccion, 'id'> = {
                fecha: new Date(),
                cuentaOrigen: cuenta.numeroCuenta,
                cuentaDestino: cuenta.numeroCuenta,
                monto: monto,
                tipo: 'retiro'
            };

            // Guardar transacción en Firebase
            const transaccionesRef = ref(this.database, 'transacciones');
            const newTransaccionRef = push(transaccionesRef);

            // Agregar la transacción al objeto de actualizaciones
            updates[`transacciones/${newTransaccionRef.key}`] = {
                ...nuevaTransaccion,
                fecha: nuevaTransaccion.fecha.toISOString()
            };

            // Actualizar todo en una sola operación
            update(ref(this.database), updates)
                .then(() => resolve(true))
                .catch(error => {
                    console.error('Error al realizar retiro:', error);
                    reject(error);
                });
        });
    }

    // Obtener el nombre de la cuenta por su ID
    obtenerNombreCuenta(cuentaUID: number): string {
        const cuenta = this.getCuentas().find(c => c.numeroCuenta === cuentaUID);
        return cuenta ? cuenta.nombre : 'Cuenta Desconocida';
    }


    obtenerSaldoCuenta(cuentaUID: string): number {
        const cuenta = this.getCuentas().find(c => c.uid === cuentaUID);
        return cuenta ? cuenta.saldoDisponible : 0;
    }
}