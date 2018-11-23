# Halon CLI

CLI tools to manage the Halon e-mail platform.

## Tools

### Halon Configuration Tool (hct)

<p align="center">
    <img src="https://docs.halon.io/cli/hct.svg">
</p>

### Halon Operations Tool (hot)

<p align="center">
    <img src="https://docs.halon.io/cli/hot.svg">
</p>

## Installation

### Global

* Run ```npm install -g @halon/cli```

### Local

(in a folder)

* Run ```npm init --yes```

* Run ```npm install @halon/cli```

* Add the following scripts to package.json
    ```
    "scripts": {
        "hct": "hct",
        "hot": "hot",
        "hqt": "hqt"
    }
    ```