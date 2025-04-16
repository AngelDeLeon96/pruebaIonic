import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Database, ref, set, push, onValue, get, update, child } from '@angular/fire/database';
import { DataService, Cuenta } from './data.service';

export interface MyCriptos {
    id: string;
    name: string;
    symbol: string;
    monto: number;
    price: number;
}

export interface Criptos {
    id: string;
    name: string;
    symbol: string;
    price: number;
}
export interface CompraResponse {
    success: boolean;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class CriptoService {
    public myCriptosSubject = new BehaviorSubject<MyCriptos[]>([]);
    public criptos = new BehaviorSubject<Criptos[]>([]);
    public myCriptos$: Observable<MyCriptos[]> = this.myCriptosSubject.asObservable();
    public criptos$: Observable<Criptos[]> = this.criptos.asObservable();

    // Lista predefinida de criptomonedas disponibles
    private defaultCriptos: Criptos[] = [
        { id: 'btc', name: 'Bitcoin', symbol: 'BTC', price: 61245.00 },
        { id: 'eth', name: 'Ethereum', symbol: 'ETH', price: 3054.62 },
        { id: 'bnb', name: 'BNB', symbol: 'BNB', price: 551.48 },
        { id: 'sol', name: 'Solana', symbol: 'SOL', price: 142.10 }
    ];

    constructor(
        private database: Database,
        private dataService: DataService
    ) {
        // Cargamos las criptomonedas generales
        this.cargarCriptomonedas();
        // Cargamos las criptomonedas del usuario
        this.cargarMyCriptosDesdeFirebase();
    }

    // Carga las criptomonedas generales (inicializándolas en Firebase si no existen)
    private cargarCriptomonedas() {
        const criptosRef = ref(this.database, 'criptomonedas_lista');

        // Primero verificamos si ya existen en Firebase
        get(criptosRef).then((snapshot) => {
            if (snapshot.exists()) {
                // Si ya existen, las cargamos
                const data = snapshot.val();
                const criptosArray = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key
                }));
                this.criptos.next(criptosArray);
            } else {
                // Si no existen, inicializamos con las predefinidas
                this.inicializarCriptomonedas();
            }
        }).catch(error => {
            console.error('Error al cargar criptomonedas:', error);
            // En caso de error, usamos las predefinidas
            this.criptos.next(this.defaultCriptos);
        });
    }

    // Inicializa las criptomonedas generales en Firebase
    private inicializarCriptomonedas() {
        const updates: any = {};

        this.defaultCriptos.forEach(cripto => {
            updates[`criptomonedas_lista/${cripto.id}`] = {
                name: cripto.name,
                symbol: cripto.symbol,
                price: cripto.price
            };
        });

        update(ref(this.database), updates)
            .then(() => {
                console.log('Criptomonedas inicializadas exitosamente');
                this.criptos.next(this.defaultCriptos);
            })
            .catch(error => {
                console.error('Error al inicializar criptomonedas:', error);
                this.criptos.next(this.defaultCriptos);
            });
    }

    // Carga las criptomonedas del usuario desde Firebase
    private cargarMyCriptosDesdeFirebase() {
        const myCriptosRef = ref(this.database, 'mis_criptomonedas');
        onValue(myCriptosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const myCriptosArray = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key
                }));
                this.myCriptosSubject.next(myCriptosArray);
            } else {
                this.myCriptosSubject.next([]);
            }
        });
    }

    // Obtener criptomonedas actuales del usuario
    getCriptos(): MyCriptos[] {
        return this.myCriptosSubject.value;
    }

    // Método para comprar criptomonedas
    async comprarCripto(cuentaId: string, criptoId: string, cantidadCripto: number): Promise<CompraResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                // Validaciones iniciales
                if (!cuentaId || !criptoId || cantidadCripto <= 0) {
                    resolve({
                        success: false,
                        message: 'Parámetros inválidos para la compra'
                    });
                    return;
                }

                // Obtener la cuenta
                const cuentas = this.dataService.getCuentas();
                const cuenta = cuentas.find(c => c.uid === cuentaId);

                if (!cuenta) {
                    resolve({
                        success: false,
                        message: 'Cuenta no encontrada'
                    });
                    return;
                }

                // Obtener la cripto a comprar de la lista general
                const criptos = this.criptos.value;
                const cripto = criptos.find(c => c.id === criptoId);

                if (!cripto) {
                    resolve({
                        success: false,
                        message: 'Criptomoneda no encontrada'
                    });
                    return;
                }

                // Calcular el costo total de la compra
                const costoTotal = cantidadCripto * cripto.price;

                // Verificar si hay saldo suficiente
                if (cuenta.saldoDisponible < costoTotal) {
                    resolve({
                        success: false,
                        message: 'Saldo insuficiente para realizar la compra'
                    });
                    return;
                }

                // Actualizar saldo en la cuenta
                const nuevoSaldo = cuenta.saldoDisponible - costoTotal;

                // Actualizar cantidad de criptomoneda del usuario
                let nuevaCantidadCripto = cantidadCripto;
                const criptoExistente = this.myCriptosSubject.value.find(c => c.id === criptoId);
                if (criptoExistente) {
                    nuevaCantidadCripto += criptoExistente.monto;
                }

                // Preparar actualizaciones en Firebase
                const updates: any = {};

                // Actualizar saldo en la cuenta
                updates[`cuentas/${cuenta.uid}/saldoDisponible`] = nuevoSaldo;

                // Actualizar o crear registro de criptomoneda del usuario
                updates[`mis_criptomonedas/${criptoId}/monto`] = nuevaCantidadCripto;
                updates[`mis_criptomonedas/${criptoId}/name`] = cripto.name;
                updates[`mis_criptomonedas/${criptoId}/symbol`] = cripto.symbol;
                updates[`mis_criptomonedas/${criptoId}/price`] = cripto.price;

                // Registrar transacción
                const nuevaTransaccion = {
                    fecha: new Date().toISOString(),
                    cuentaOrigen: cuenta.numeroCuenta,
                    cuentaDestino: cuenta.numeroCuenta,
                    monto: costoTotal,
                    tipo: 'compra_cripto',
                    criptoId: criptoId,
                    cantidadCripto: cantidadCripto,
                    precioCripto: cripto.price
                };

                // Crear referencia para la nueva transacción
                const transaccionesRef = ref(this.database, 'transacciones');
                const newTransaccionRef = push(transaccionesRef);
                updates[`transacciones/${newTransaccionRef.key}`] = nuevaTransaccion;

                // Ejecutar todas las actualizaciones de manera atómica
                update(ref(this.database), updates)
                    .then(() => {
                        resolve({
                            success: true,
                            message: `Compra exitosa: ${cantidadCripto} ${cripto.symbol} por $${costoTotal.toFixed(2)}`
                        });
                    })
                    .catch(error => {
                        console.error('Error al realizar la compra de cripto:', error);
                        resolve({
                            success: false,
                            message: 'Error en la transacción: ' + error.message
                        });
                    });

            } catch (error) {
                console.error('Error en comprarCripto:', error);
                resolve({
                    success: false,
                    message: 'Error inesperado al procesar la compra'
                });
            }
        });
    }

    // Método para vender criptomonedas
    async venderCripto(cuentaId: string, criptoId: string, cantidadCripto: number): Promise<CompraResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                // Validaciones iniciales
                if (!cuentaId || !criptoId || cantidadCripto <= 0) {
                    resolve({
                        success: false,
                        message: 'Parámetros inválidos para la venta'
                    });
                    return;
                }

                // Obtener la cuenta
                const cuentas = this.dataService.getCuentas();
                const cuenta = cuentas.find(c => c.uid === cuentaId);

                if (!cuenta) {
                    resolve({
                        success: false,
                        message: 'Cuenta no encontrada'
                    });
                    return;
                }

                // Obtener la cripto a vender del usuario
                const misCriptos = this.myCriptosSubject.value;
                const miCripto = misCriptos.find(c => c.id === criptoId);

                if (!miCripto) {
                    resolve({
                        success: false,
                        message: 'No tienes esta criptomoneda para vender'
                    });
                    return;
                }

                // Verificar si tiene suficiente cantidad para vender
                if (miCripto.monto < cantidadCripto) {
                    resolve({
                        success: false,
                        message: 'No tienes suficiente cantidad de esta criptomoneda para vender'
                    });
                    return;
                }

                // Calcular el valor total de la venta
                const valorTotal = cantidadCripto * miCripto.price;

                // Actualizar saldo en la cuenta
                const nuevoSaldo = cuenta.saldoDisponible + valorTotal;

                // Actualizar cantidad de criptomoneda
                const nuevaCantidadCripto = miCripto.monto - cantidadCripto;

                // Preparar actualizaciones en Firebase
                const updates: any = {};

                // Actualizar saldo en la cuenta
                updates[`cuentas/${cuentaId}/saldoDisponible`] = nuevoSaldo;

                // Actualizar registro de criptomoneda del usuario
                if (nuevaCantidadCripto > 0) {
                    updates[`mis_criptomonedas/${criptoId}/monto`] = nuevaCantidadCripto;
                } else {
                    // Si vendemos todo, podríamos eliminar el registro
                    // O mantenerlo con monto 0, según prefiera la lógica de negocio
                    updates[`mis_criptomonedas/${criptoId}/monto`] = 0;
                }

                // Registrar transacción
                const nuevaTransaccion = {
                    fecha: new Date().toISOString(),
                    cuentaOrigen: cuenta.numeroCuenta,
                    cuentaDestino: cuenta.numeroCuenta,
                    monto: valorTotal,
                    tipo: 'venta_cripto',
                    criptoId: criptoId,
                    cantidadCripto: cantidadCripto,
                    precioCripto: miCripto.price
                };

                // Crear referencia para la nueva transacción
                const transaccionesRef = ref(this.database, 'transacciones');
                const newTransaccionRef = push(transaccionesRef);
                updates[`transacciones/${newTransaccionRef.key}`] = nuevaTransaccion;

                // Ejecutar todas las actualizaciones de manera atómica
                update(ref(this.database), updates)
                    .then(() => {
                        resolve({
                            success: true,
                            message: `Venta exitosa: ${cantidadCripto} ${miCripto.symbol} por $${valorTotal.toFixed(2)}`
                        });
                    })
                    .catch(error => {
                        console.error('Error al realizar la venta de cripto:', error);
                        resolve({
                            success: false,
                            message: 'Error en la transacción: ' + error.message
                        });
                    });

            } catch (error) {
                console.error('Error en venderCripto:', error);
                resolve({
                    success: false,
                    message: 'Error inesperado al procesar la venta'
                });
            }
        });
    }
}