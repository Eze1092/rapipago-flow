# Rapipago Control

IMPORTANTE: Esta aplicación debe construirse como una PWA (Progressive Web App), instalable en Windows mediante Microsoft Edge y también utilizable desde celulares. Debe incluir manifest.json, service worker, iconos de instalación y configuración PWA adecuada. La aplicación debe poder instalarse como una aplicación independiente en Windows. Quiero crear una aplicación web profesional para Windows para administrar y controlar las recaudaciones de un Rapipago.

La aplicación debe ser multiusuario y todos los usuarios deben trabajar sobre la misma base de datos en tiempo real.

IMPORTANTE:
No quiero una aplicación de ejemplo ni datos ficticios. Quiero construir la estructura de una aplicación real, preparada para utilizarse diariamente en un comercio.

TECNOLOGÍA:

Utilizar Supabase como base de datos y autenticación.

La aplicación debe funcionar correctamente desde una PC con Windows utilizando un navegador.

Debe tener diseño responsive para que también pueda utilizarse desde celulares.

Preparar la arquitectura para que posteriormente pueda convertirse en una aplicación de escritorio para Windows si fuera necesario.

Utilizar una interfaz moderna, clara, profesional y sencilla de usar.

Idioma: español.

Moneda: pesos argentinos (ARS).

Formato de fechas: DD/MM/YYYY.

Formato de importes: $1.234.567,89.

DATOS INICIALES DEL COMERCIO:

El comercio tiene dos bocas de cobro:

Boca 41159

Boca 42278

Debe existir una sección de configuración donde posteriormente pueda agregar, modificar o desactivar bocas.

USUARIOS Y CAJEROS:

Debe existir un sistema de usuarios.

Roles iniciales:

ADMINISTRADOR

Acceso completo.

Puede ver todas las bocas.

Puede ver todos los cajeros.

Puede registrar, modificar y consultar movimientos.

Puede administrar usuarios.

Puede consultar reportes.

Puede realizar ajustes.

Puede visualizar el balance general.

CAJERO

Puede iniciar sesión.

Puede registrar las cobranzas correspondientes a su turno.

Debe quedar registrado automáticamente qué usuario realizó cada operación.

Puede consultar sus propias operaciones.

No puede eliminar movimientos.

No puede modificar movimientos cerrados.

No puede administrar usuarios ni configuraciones.

Debe quedar registrada la fecha y hora de cada operación.

PANTALLA PRINCIPAL / DASHBOARD:

Crear un dashboard donde se pueda visualizar rápidamente:

Recaudación de hoy.

Recaudación de la semana.

Recaudación del mes.

Dinero pendiente de retiro.

Dinero retirado por el camión.

Dinero pendiente de acreditación.

Dinero acreditado.

Diferencias detectadas.

Saldo positivo o negativo.

Mostrar también la información separada por:

Boca 41159.

Boca 42278.

Cajero.

RECAUDACIONES DIARIAS:

Crear una sección "Recaudaciones".

Cada registro debe contener:

ID único.

Fecha.

Hora.

Boca.

Cajero/usuario.

Importe cobrado.

Observaciones.

Usuario que creó el registro.

Fecha y hora de creación.

Ejemplo:

21/09/2026
Boca 41159
Cajero Juan
Recaudación: $350.000

21/09/2026
Boca 42278
Cajero María
Recaudación: $258.000

Total del día:
$608.000

La aplicación debe calcular automáticamente los totales.

Debe poder filtrarse por:

Fecha.

Rango de fechas.

Boca.

Cajero.

CIERRE DIARIO:

Crear una función de "Cierre diario".

El administrador debe poder cerrar una jornada.

Al cerrar una jornada debe mostrarse:

Total recaudado Boca 41159.

Total recaudado Boca 42278.

Total general.

Cantidad de operaciones.

Recaudación por cajero.

Diferencias o ajustes.

Estado del cierre.

Una vez cerrado, el cierre no debe poder modificarse normalmente.

Si el administrador necesita modificar algo, debe realizarse mediante un "Ajuste" que quede registrado en el historial.

RECAUDACIÓN DEL CAMIÓN:

Crear una sección "Retiros del camión".

Cuando el camión recaudador retire dinero, registrar:

Fecha.

Hora.

Boca o bocas involucradas.

Importe declarado.

Importe efectivamente retirado.

Número de retiro/remito si existe.

Observaciones.

Usuario que registró el retiro.

Ejemplo:

22/09/2026
Retiro del camión
Bocas: 41159 + 42278
Importe retirado: $4.008.000

IMPORTANTE:

El dinero retirado NO debe considerarse automáticamente como dinero acreditado.

Debe pasar por diferentes estados:

RECAUDADO
↓
RETIRADO
↓
PENDIENTE DE ACREDITACIÓN
↓
ACREDITADO

ACREDITACIONES:

Crear una sección "Acreditaciones".

Cuando la empresa acredite el dinero, registrar:

Fecha de acreditación.

Fecha correspondiente al retiro.

Importe acreditado.

Número de operación/comprobante si existe.

Observaciones.

Usuario que registró la acreditación.

Ejemplo:

Retiro:
$4.008.000

Acreditación:
$4.005.500

Diferencia:
-$2.500

La aplicación debe detectar automáticamente la diferencia.

CONTROL DE SALDOS:

Esta es una de las funciones más importantes.

El sistema debe mantener un balance permanente.

Conceptualmente:

RECAUDACIONES
+
AJUSTES POSITIVOS

RETIROS

AJUSTES NEGATIVOS

DINERO PENDIENTE / SALDO

Y además debe existir un control independiente de:

RETIRADO
vs.
ACREDITADO

Ejemplo:

Recaudado:
$4.008.000

Retirado:
$4.008.000

Acreditado:
$4.005.500

Diferencia:
-$2.500

Mostrar claramente las diferencias.

Si el saldo es positivo, mostrarlo como saldo a favor.

Si el saldo es negativo, mostrarlo como saldo pendiente/diferencia.

No utilizar colores como único indicador. Siempre mostrar también el importe y el texto.

HISTORIAL:

Crear una sección "Historial".

Debe mostrar todas las operaciones:

Recaudación.

Retiro.

Acreditación.

Ajuste.

Cierre.

Modificación administrativa.

Cada movimiento debe mostrar:

Fecha.

Hora.

Usuario.

Tipo de operación.

Boca.

Importe.

Descripción.

Estado.

IMPORTANTE:
No permitir borrar registros financieros definitivamente.

Si se necesita anular una operación, utilizar el concepto "ANULADO" y conservar el registro original.

AUDITORÍA:

Registrar automáticamente:

Quién creó cada movimiento.

Cuándo lo creó.

Quién lo modificó.

Cuándo lo modificó.

Qué valor tenía antes.

Qué valor tiene después.

Esto es fundamental porque habrá varios cajeros utilizando el sistema.

REPORTES:

Crear sección "Reportes".

Permitir generar:

Reporte diario.

Reporte semanal.

Reporte mensual.

Reporte por boca.

Reporte por cajero.

Reporte de retiros.

Reporte de acreditaciones.

Reporte de diferencias.

Balance general.

Permitir exportar los reportes a Excel/CSV y, si es posible, PDF.

FILTROS:

Todos los reportes deben poder filtrarse por:

Desde.

Hasta.

Boca.

Cajero.

Tipo de movimiento.

Estado.

DISEÑO:

Quiero un diseño profesional y limpio.

Menú lateral:

INICIO
RECAUDACIONES
CIERRES
RETIROS
ACREDITACIONES
BALANCE
REPORTES
CAJEROS
BOCAS
HISTORIAL
CONFIGURACIÓN

En la pantalla de inicio mostrar tarjetas principales:

RECAUDADO HOY
PENDIENTE DE RETIRO
RETIRADO
PENDIENTE DE ACREDITACIÓN
ACREDITADO
DIFERENCIAS
SALDO

También mostrar un gráfico de evolución de la recaudación diaria.

BASE DE DATOS:

Crear las tablas necesarias en Supabase.

Como mínimo:

users/profiles
bocas
recaudaciones
cierres
retiros
acreditaciones
ajustes
auditoria

Utilizar relaciones entre las tablas.

Configurar Row Level Security (RLS) correctamente.

Los cajeros solamente deben poder acceder a la información permitida por su rol.

El administrador debe poder acceder a toda la información.

SEGURIDAD:

Autenticación mediante email y contraseña.

No guardar contraseñas directamente en tablas propias.

Utilizar Supabase Auth.

Implementar RLS.

Validar todos los importes.

No permitir importes negativos en recaudaciones, retiros o acreditaciones.

Evitar duplicación accidental de operaciones.

Confirmar operaciones importantes antes de registrarlas.

IMPORTANTE SOBRE LOS CÁLCULOS:

No quiero que los saldos se calculen solamente en el navegador.

Los datos financieros importantes deben calcularse a partir de la base de datos para evitar inconsistencias entre usuarios.

La aplicación debe manejar correctamente:

$0.

Importes grandes.

Decimales.

Diferencias.

Correcciones.

Anulaciones.

EJEMPLO REAL PARA PROBAR EL SISTEMA:

Utilizar este escenario solamente como datos de prueba:

21/09/2026:
Recaudación total: $608.000.

22/09/2026:
Recaudación total: $3.400.000.

Total acumulado:
$4.008.000.

22/09/2026:
El camión retira:
$4.008.000.

Estado:
Pendiente de acreditación.

23/09/2026:
La empresa acredita:
$4.005.500.

El sistema debe mostrar:

Total recaudado:
$4.008.000

Total retirado:
$4.008.000

Total acreditado:
$4.005.500

Diferencia:
-$2.500

Esta diferencia debe aparecer claramente en el dashboard y en el reporte de diferencias.

NO crear datos ficticios adicionales una vez terminado el ejemplo.

ANTES DE TERMINAR:

Quiero que construyas primero:

Base de datos.

Autenticación.

Usuarios y roles.

Bocas 41159 y 42278.

Recaudaciones.

Retiros.

Acreditaciones.

Cálculo de saldos.

Dashboard.

Historial/auditoría.

Reportes.

Después verificar que todos los cálculos sean consistentes.

La prioridad es que el sistema financiero sea confiable y que varios usuarios puedan trabajar simultáneamente sin pisarse los datos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rapipago-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a42d5fcc-f986-44e8-8d11-bbdc444f9de6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
