# Requisitos y Supuestos del Sistema — Panadería Pan de la Casa

*Documento consolidado a partir de `docs/hld/Informe-proyecto.md` (Sección 2: Requisitos funcionales, no funcionalos y supuestos).*

## 2. Requisitos funcionales, no funcionales y supuestos

### 2.1. Requisitos Funcionales

**RF-01 — Consulta del catálogo digital:**
El sistema debe mostrar el listado de productos activos (20 a 50 referencias) organizados por categoría, con nombre, descripción, precio e imagen cargada desde la nube.

**RF-02 — Registro de pedido web:**
El cliente debe poder seleccionar uno o varios productos, ingresar sus datos básicos de contacto (nombre y teléfono) y definir la fecha y hora de recogida (mismo día o hasta 24 h después).

**RF-03 — Confirmación y código de orden:**
Al confirmar el pedido, el sistema debe persistir el registro y devolver un resumen visual con un identificador único de seguimiento sin exigir registro previo.

**RF-04 — Autenticación y control de acceso:**
El sistema debe validar credenciales mediante tokens JWT para restringir el acceso a las vistas y endpoints operativos según el rol.

**RF-05 — Visualización y gestión de pedidos:**
El empleado de mostrador debe poder consultar el tablero de pedidos entrantes, filtrarlos por hora de recogida y actualizar su estado.

**RF-06 — Administración del catálogo (CRUD):**
El administrador debe poder crear, editar precios/descripciones, activar/inactivar o eliminar productos del catálogo y asociar sus imágenes en la nube.

### 2.2. Requisitos no funcionales

**RNF-01 — Presupuesto Operativo:**
El costo total de la infraestructura en el escenario de producción no debe superar los 150 USD por mes.

**RNF-02 — Disponibilidad:**
El sistema debe garantizar una disponibilidad mínima del 99,5% durante el horario comercial (lunes a domingo de 06:00 a 22:00; 480 horas/mes), lo que equivale a un tiempo máximo de indisponibilidad acumulada de 2,4 horas al mes.

**RNF-03 — Escalabilidad:**
La arquitectura debe soportar de forma estable incrementos de carga durante los fines de semana y horas pico sin degradación perceptible en los tiempos de respuesta.

**RNF-04 — Seguridad y Gobierno:**

- Todo el tráfico externo debe viajar cifrado mediante HTTPS/TLS con certificados administrados.
- El acceso a rutas administrativas aplica el principio de mínimo privilegio mediante validación de roles en tokens JWT.
- Cero credenciales, cadenas de conexión o llaves privadas expuestas en el código fuente o repositorio.

**RNF-05 — Respaldo y Recuperación ante Desastres:**

- **RPO (Recovery Point Objective) ≤ 24 horas:** Respaldos automáticos diarios de la base de datos documental.
- **RTO (Recovery Time Objective) ≤ 4 horas:** Capacidad de reconstrucción completa del entorno e infraestructura mediante scripts de Infraestructura como Código (IaC).

### 2.3. Supuestos del Sistema

**Horario comercial y ventana de SLA:** lunes a domingo de 06:00 a 22:00 (16 horas diarias). El compromiso de disponibilidad del 99,5% aplica prioritariamente dentro de esta franja operativa.

**Ventana de programación de pedidos:** Los pedidos se programan exclusivamente para recolección presencial en el punto de venta el mismo día o con un máximo de 24 horas de anticipación.

**Modalidad de pago:** Pago contra entrega en tienda física (efectivo o datáfono), eximiendo la solución de pasarelas de pago en línea y del alcance normativo PCI-DSS.

**Concurrencia operativa interna:** Entre 1 y 2 empleados operan simultáneamente el tablero de mostrador y administración, bajo una estructura de tres roles diferenciados (Cliente, Empleado de mostrador y Administrador).

**Operación base (Lunes a Jueves):**

- ~200 visitas diarias al catálogo web.
- ~40 pedidos registrados por día.
- Promedio de 10 a 15 peticiones concurrentes por minuto en franjas pico (desayuno y media tarde).

**Operación en temporada alta / Fin de semana (Factor de escala 3x):**

- ~600 visitas diarias al catálogo web.
- ~120 pedidos registrados por día.
- Picos de hasta 45 a 50 peticiones por minuto en las horas de mayor afluencia (desayuno y media tarde).

**Tamaño promedio de cargas útiles (payloads):**

- Consulta de catálogo completo (JSON): ~15 KB a 25 KB.
- Creación de pedido (JSON): < 2 KB.

**Catálogo de productos:**

- Portafolio activo de 20 a 50 productos de panadería y pastelería.
- Cada referencia cuenta con 1 imagen optimizada en formato JPEG con un peso máximo de 200 KB a 300 KB.
- Volumen total inicial de almacenamiento de imágenes: < 15 MB.

**Volumen transaccional (Pedidos):**

- Entre 1.800 y 2.000 pedidos mensuales persistidos como documentos JSON embebidos (~1 KB por registro).
- Crecimiento mensual estimado de la base de datos: 2 MB a 5 MB por mes.

**Retención y depuración de logs:**
Los logs de aplicación, acceso y telemetría se retienen durante 30 días en Azure Monitor / Log Analytics antes de su depuración automática.

**Frontend:**
Single Page Application (SPA) desacoplada alojada en Azure Static Web Apps con distribución CDN y certificados SSL administrados gratuitos.

**Backend:**
API Serverless modular (FaaS) implementada mediante Azure Functions en plan de consumo, organizada por módulos funcionales y con reutilización del pool de conexiones a base de datos a nivel de contexto de ejecución.

**Base de datos:**
Motor documental NoSQL utilizando Azure Cosmos DB (API para MongoDB) en su nivel gratuito de por vida (Free Tier de 1.000 RU/s y 25 GB de almacenamiento).

**Almacenamiento de imágenes:**
Contenedor dedicado en Azure Storage Account (Blob Storage) con acceso de lectura pública anónima a nivel de blob para entrega directa hacia el navegador mediante URL.
# Proyecto-final-PENU
