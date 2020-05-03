//Adicionando  as lib de axios ara fazer requisição HTTP e fs para manipular arquivos
const axios = require('axios').default
const fs = require('fs')


/**
 * Função para retornar a url de acesso as categorias do ambiente vtex, de acordo com os parametros inseridos 
 * @function urlAccount
 * @param {*} accountName - Account name do ambiente vtex
 * @param {*} environment - Environment, pode ser pelo myvtex ou vtexcommercestable
 * @param {*} categoryLevels - Valor que define até que nivel de categoria será consultado
 * @returns {string} - retorna a url para acesso as categorias do ambiente
 */
function urlAccount(accountName, environment, categoryLevels) {
    //Verificamos qual environment será acessado e adicionamos o complemento de acordo com ele
    if (environment == 'vtexcommercestable') {
        environment += '.com.br'
    } else if (environment == 'myvtex') {
        environment += '.com'
    }
    //Geramos a url de acesso com os parametros inseridos
    const url = `https://${accountName}.${environment}/api/catalog_system/pub/category/tree/${categoryLevels}`
        //Retornamos a url
    return url

}


/**
 * Função que executa uma requisição com axios, em uma determinado ambiente vtex, para retornar as categorias
 * @function getCategories
 * @param {*} url - Url de acesso as categorias do ambiente
 * @returns {array of objects} - retorna um array de objetos com as categorias e suas respectivas subcategorias
 */
async function getCategories(url) {
    categories = []
    try {

        categories = await axios.get(url);
        // console.log(categories.data)
    } catch (error) {
        console.error(error);
    }
    return categories.data
}


/**
 * Função para gerar um arquivo json do menu para vtex.io
 * @function generate 
 * @param {object} input - um objeto com os dados dos blocos a serem criados com as informaçoes dinamicas das categorias
 * @param {object} config - um objeto com valores dos blocos no io a serem gerados
 * @returns {object} - retorna um objeto com todos os componenentes do menu
 */
function generate(input, config) {
    const rows = [],
        cols = [],
        code = {}
    const {
        identifierChar
    } = config
    const getSettings = (entry, name) => {
        return `${config[entry]}${identifierChar}${name}`
    }
    input.items.map((item) => {
        const blockName = getSettings(item.block, item.name)

        if (blockName.includes(`menu-item`)) {
            code[blockName] = {
                ...item.props,
                blocks: []
            }
        } else if (blockName.includes(`submenu.accordion`) || blockName.includes(`vtex.menu@2.x:menu`)) {
            code[blockName] = {
                ...item.props,
                children: []
            }
        }

        if (item.blocks) {
            code[blockName]['blocks'] = generate({
                "items": item.blocks
            }, config)
        } else if (item.children) {
            code[blockName]['children'] = generate({
                "items": item.children
            }, config)
        }

    })
    return code
}


/**
 * Função para normalizar o nome das categorias para que possa ser usado como identificador unico dos blocos em vtex.io.childrenContainer
 * trocando espaço e  "|" por "-" e retirando a "," 
 * @function normalizeString
 * @param {*} string - string para ser normalizada
 * @returns {string} - retorna a string normalizada
 */
function normalizeString(string) {
    str = string.toLowerCase();
    str = str.replace(/[ ]/g, "-")
    str = str.replace(/[,]/g, "")
    str = str.replace(/[-][|][-]/g, "-")
    const parsed = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return parsed
}


/**
 * Função para criar o arquivo do menu de categorias com o json gerado
 * @function createMenuJson
 * @param {*} string - string do json gerado com o menu 
 */
function createMenuJson(string) {
    path = "./Codeby/Estudo/vtex.io-menu-category-generator/json/menu-category.json"
    fs.writeFile(path, string, function(err) {
        if (err) throw err;
        console.log(`Menu de categorias gerado com suceso em: ${path}`);
    });
}


/**
 * Função assincrona principal:
 * - gera a url do ambiente vtex;
 * - cria as configurações dos blocos que serão gerados no json;
 * - faz a chamada das categorias do ambiente
 * - mapeia as categorias e gera o objeto json com as configurações do blocos com os dados mapeados
 * - gera o json final do menu de categorias, enviando o objeto json com a estrutura e o objeto config com as configurações do json
 * - cria o arquivo com a string do json do menu
 * @function debug
 */
async function debug() {
    try {
        const url = urlAccount('extrafarma', 'myvtex', '3')
        const itemBlock = "menu-item"
        const accordionBlock = "vtex.menu@2.x:submenu.accordion"
        const subMenuBlock = "vtex.menu@2.x:menu"
        const identifierChar = "#"
        const settings = {
            itemBlock,
            accordionBlock,
            subMenuBlock,
            identifierChar
        }
        const json = {}
        json['items'] = []
        var categories = []

        categories = await getCategories(url)
            //console.log(categories)

        categories.map(function(item, index) {
            json.items.push({
                "name": normalizeString(item.name),
                "block": "itemBlock",
                "props": {
                    "id": "menu-item-category",
                    "type": "custom",
                    "iconId": null,
                    "highlight": false,
                    "itemProps": {
                        "type": "internal",
                        "noFollow": true,
                        "href": item.url,
                        "tagTitle": item.MetaTagDescription,
                        "text": item.Title
                    }
                },
                "blocks": item.hasChildren ? [{
                    "name": normalizeString(item.name),
                    "block": "accordionBlock",
                    "props": {

                    },
                    "children": [{
                        "name": normalizeString(item.name),
                        "block": "subMenuBlock",
                        "props": {
                            "orientation": "vertical"
                        },
                        "children": []
                    }]
                }] : []
            })
            if (item.hasChildren) {

                item.children.map(function(subitem, subindex) {
                    json.items[index]['blocks'][0]['children'][0]['children'].push({
                        "name": normalizeString(subitem.name),
                        "block": "itemBlock",
                        "props": {
                            "id": "menu-item-category",
                            "type": "custom",
                            "iconId": null,
                            "highlight": false,
                            "itemProps": {
                                "type": "internal",
                                "href": subitem.url,
                                "noFollow": false,
                                "tagTitle": subitem.MetaTagDescription,
                                "text": subitem.Title
                            }
                        },
                        "blocks": subitem.hasChildren ? [{
                            "name": normalizeString(subitem.name),
                            "block": "accordionBlock",
                            "props": {

                            },
                            "children": [{
                                "name": normalizeString(subitem.name),
                                "block": "subMenuBlock",
                                "props": {
                                    "orientation": "vertical"
                                },
                                "children": []
                            }]
                        }] : []
                    })

                    if (subitem.hasChildren) {
                        subitem.children.map(function(ssubitem) {
                            json.items[index]['blocks'][0]['children'][0]['children'][subindex]['blocks'][0]['children'][0]['children'].push({
                                "name": normalizeString(ssubitem.name),
                                "block": "itemBlock",
                                "props": {
                                    "id": "menu-item-category",
                                    "type": "custom",
                                    "iconId": null,
                                    "highlight": false,
                                    "itemProps": {
                                        "type": "internal",
                                        "noFollow": true,
                                        "href": ssubitem.url,
                                        "tagTitle": ssubitem.MetaTagDescription,
                                        "text": ssubitem.Title
                                    }
                                },
                                "blocks": []
                            })
                        })
                    }
                })

            }


        });

        const generatedJSON = generate(json, settings)


        createMenuJson(JSON.stringify(generatedJSON, null, '\t'))
    } catch (e) {
        console.error(e);
    }
}
debug()