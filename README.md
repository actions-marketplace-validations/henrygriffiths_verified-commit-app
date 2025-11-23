# Verified Commit App

This action uses a user-generated app to author commits to a repository

# Usage
```yaml
- uses: henrygriffiths/verified-commit-app@v1
  with:
    app-id: ''
    # Required
    # ID of App

    app-key: ''
    # Required
    # App Private Key (Pem File)

    repository: ''
    # Optional
    # Repository to Commit To (Defaults to ${{ github.repository }})

    baseref: ''
    # Optional
    # Ref to Base Commit Off Of (Defaults to ${{ github.ref }})

    ref: ''
    # Optional
    # Ref to Commit To (Defaults to baseref Input)

    commitmsg: ''
    # Optional
    # Commit Message (Defaults to Empty)

    files: ''
    # Required
    # Files To Commit

```

# Examples

## Commit to Current Branch
```yaml
- uses: henrygriffiths/verified-commit-app@v1
  with:
    app-id: ${{ secrets.app-id }}
    app-key: ${{ secrets.app-key }}
    commitmsg: 'message'
    files: |
      filea.txt
      fileb.txt
```

## Commit to a Different Branch
```yaml
- uses: henrygriffiths/verified-commit-app@v1
  with:
    app-id: ${{ secrets.app-id }}
    app-key: ${{ secrets.app-key }}
    commitmsg: 'message'
    ref: branch2
    files: |
      filea.txt
      fileb.txt
```

## Commit to a Different Repository
```yaml
- uses: henrygriffiths/verified-commit-app@v1
  with:
    app-id: ${{ secrets.app-id }}
    app-key: ${{ secrets.app-key }}
    repository: example/example
    baseref: main
    ref: main
    commitmsg: 'message'
    files: |
      filea.txt
      fileb.txt
```

# License

This project is released under the [MIT License](LICENSE)
