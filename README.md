# Backend Node.js con SQLite

Backend simple con Express y SQLite3.

## Instalación

```bash
npm install
```

## Ejecutar

```bash
npm start
```

## Endpoints

### Instalar tabla
```
GET http://localhost:3001/install
```
Valida si la tabla existe, si no existe la crea.

### Obtener todos los usuarios
```
GET http://localhost:3001/users
```

### Obtener usuario por ID
```
GET http://localhost:3001/users/:id
```

### Crear usuario
```
POST http://localhost:3001/users
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "mipassword123"
}
```

### Actualizar usuario
```
PUT http://localhost:3001/users/:id
Content-Type: application/json

{
  "name": "Juan Pérez Actualizado",
  "email": "juan.nuevo@example.com",
  "password": "nuevopassword"
}
```

### Login
```
POST http://localhost:3001/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "mipassword123"
}
```

### Crear usuarios de prueba
```
GET http://localhost:3001/seed
```
Crea 3 usuarios de prueba con password: `password123`
