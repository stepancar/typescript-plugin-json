# typescript-plugin-json
Try to cast json setting consts to strings


Steps
- 1 iteration
```
    import json from './data.json';
```

json is object with hardcoded type like

```
{
    foo: 'BAR'
}
```

- 2 interation

type generated automatically from json
algoritm
- read json as is
- each string replace to 'stringvalue as const'

possible problems
conflict with native typscript json module resolver
solutions: new extension or introducing somthing like module.json, disable native typescript json module resolver

