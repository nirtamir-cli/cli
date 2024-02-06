# Installation

The CLI can be installed locally to your project via

```sh
npm install nirtamir-cli/core
```

Or installed globally:
### UNIX/MacOS/Linux

In order to install global packages on Unix based systems you will need to grant npm special system permissions using the `sudo` command, suffixed by the command you would like to run.

```sh
sudo npm install -g nirtamir-cli/core
```

### Windows

```sh
npm install -g nirtamir-cli/core
```

It can then be invoked via the keyword `solid`, and the help page can be displayed with `solid --help`

```txt
┌   nirtamir-cli
solid <subcommand>

where <subcommand> can be one of:

- add - Can add and install integrations: `solid add unocss`.
- docs
- new - Creates a new solid project
- set
- start - Commands specific to solid start
- playground

For more help, try running `solid <subcommand> --help`
```
