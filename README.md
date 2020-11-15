# typescript-plugin-json

## Usage
install

```bash
npm install typescript-plugin-json -D
```

```bash
yarn add typescript-plugin-json -D
```

add it to your tsconfig.json
```
"compilerOptions": {
    "plugins": [
        { "name": "typescript-plugin-json" },
    ]
}
```

data.json

```json
{
    "foo": "BAR"
}
```

*.ts
```typescript
import data from './data.json';

console.log(data.foo);

```

Try to cast json setting consts to strings
