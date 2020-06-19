# Blueprints

This extension allows you to create workspace files via a blueprint.

## How to generate a blueprint?

![Generating a blueprint](https://raw.githubusercontent.com/Neotro/vsce-blueprints/master/assets/generate-blueprint.gif)

## How to create a new blueprint?

![Creating a blueprint](https://github.com/Neotro/vsce-blueprints/blob/master/assets/create-blueprint.gif?raw=true)

## Blueprint Configuration

Each blueprint should have a `blueprint.json` file. This file contains the manifest for the blueprint.

| Property | Description |
|--|--|
| name | The name of the blueprint |
| variables | An array of variables to be used throughout the blueprint. |
| prescripts | Scripts to be run within the target directory, before the blueprint is initialized . |
| postscripts | Scripts to be run within the target directory, after the blueprint has been initialized . |

## Variable Syntax

Variables are replaced when the blueprint is initialized. The following syntaxes can be used to mutate the case of the variable's value.

| Syntax | Description |
|--|--|
| $[var] | The value as is |
| $[=var] | Pascal Case |
| $[~var] | Camel Case |
| $[-var] | Kebab Case |
| $[_var] | Snake Case |

## VSC Commands

`blueprints.blueprints`: Opens the Blueprints menu.