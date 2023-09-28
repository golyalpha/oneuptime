### Installation

```
helm install oneuptime ./HelmChart/public/oneuptime -f ./HelmChart/public/oneuptime/values.yaml
```

### Upgrade

```
helm upgrade oneuptime ./HelmChart/public/oneuptime -f ./HelmChart/public/oneuptime/values.yaml
```

### Remove

```
helm uninstall oneuptime 
```

### Lint 

```
helm lint ./HelmChart/public/oneuptime
```


### Install in Staging 

```
helm install oneuptime ./HelmChart/public/oneuptime -f ./HelmChart/public/oneuptime/values.yaml -f ./HelmChart/test.values.yaml
```

### Run tests

```
helm test oneuptime
```