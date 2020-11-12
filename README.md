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



- 2 interation

type generated automatically from json
algoritm
- read json as is
- each string replace to 'stringvalue as const'

possible problems
conflict with native typscript json module resolver
solutions: new extension or introducing somthing like module.json, disable native typescript json module resolver

type A = {

    foo: 'sdfsdf'
}

function f(a: A) {

}

const b = {
    foo: 'asdasd'
};

f(b);

f({
    foo: 'asdasd'
})