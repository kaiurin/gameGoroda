const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const pg = require('pg');
const conString = "postgres://postgres:1111@localhost:5432/cities";
const client = new pg.Client(conString);
const b = 1;

let usedTowns = [];  // массив использованных городов
let gameResult;
let answerCheckResult;
let cityCheckOperator_b;
let cityCheckOperator_a;
client.connect(function (err) {
    if (err) {
        return console.error('could not connect to postgres', err);
    }
});

function getCity(cb) {             // запрос города
    let i = 1;
    let params = [];
    for (i; i <= usedTowns.length; i++) {
        params.push('$' + (i + 1));
    }
    let queryText = 'SELECT name FROM country WHERE name LIKE $1 AND name NOT IN (' + params.join(',') + ')';
    let parameters = [gameResult + "%", ...usedTowns];
    if (gameResult === undefined || gameResult === 'lost') {
        client.query('SELECT name FROM country ORDER BY RANDOM() LIMIT 1', function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
            cb(result.rows[0].name)
        })
    }
    else {
        client.query(queryText, parameters, function (err, result) {
            if (err) {
                return console.error('error running query', err);
            }
            if (result.rows[0] !== undefined) {
                cb(result.rows[0].name);
            } else {
                cb(undefined);
            }

        })
    }
}

function checkAnswerCondition(cb) {      //проверка ответа, есть ли такой
    client.query('SELECT EXISTS(SELECT name FROM country WHERE name = $1)', [answerCheckResult], function (err, result) {
        if (err) {
            return console.error('error running query', err);
        }
        cb(result.rows[0].exists);
    });
}

function checkCityRemainderCondition(cb) {  //проверка остались ли ответы на последнюю букву города
    let i = 1;
    let params = [];
    for (i; i <= usedTowns.length; i++) {
        params.push('$' + (i + 1));
    }
    let queryText = 'SELECT name FROM country WHERE name LIKE $1 AND name NOT IN (' + params.join(',') + ')';
    let parameters = [cityCheckOperator_a + "%", ...usedTowns];
    client.query(queryText, parameters, function (err, result) {
        if (err) {
            return console.error('error running query', err);
        }
        if (result.rows[0] !== undefined) {
            cb(result.rows[0].name);
        } else {
            cb(undefined);
        }
    })
}

function checkCityCondition(cb) {      // проверка есть ли город на последнюю букву
    client.query('SELECT * FROM country WHERE name LIKE $1 ORDER BY RANDOM() LIMIT 1', [cityCheckOperator_b + "%"], function (err, result) {
        if (err) {
            return console.error('error running query', err);
        }
        if (result.rows[0] !== undefined) {
            cb(result.rows[0].name);
        } else {
            cb(undefined);
        }
    });
}

function startGame() {
    getCity(function checkCity(city) {
        let al = 1;
        let asubs;
        if (city !== undefined) {
            usedTowns.push(city);
            rl.question('город ' + city + '-', (answer) => {
                asubs = -answer.length + (answer.length - al);
                answerCheckResult = answer;
                checkAnswerCondition(function checkAnswer(answerCheckResult) {
                    if (answerCheckResult === true) {
                        if ((usedTowns.indexOf(answer) !== -1) === false) {
                            usedTowns.push(answer);
                            let cl = 1;
                            let csubs;
                            csubs = -city.length + (city.length - cl);
                            cityCheckOperator_a = city.substr(csubs, b).toUpperCase();
                            checkCityRemainderCondition(function checkCityRemainderConditionEngine(cityRemainCheckResult) {
                                if (cityRemainCheckResult !== undefined) {
                                    cityCheckOperator_b = city.substr(csubs, b).toUpperCase();
                                    checkCityCondition(function checkCityConditionEngine(cityCheckResult) {
                                        if (cityCheckResult === undefined) {
                                            cl = cl + 1;
                                            csubs = -city.length + (city.length - cl);
                                            cityCheckOperator_b = city.substr(csubs, b).toUpperCase();
                                            checkCityCondition(checkCityConditionEngine)
                                        } else {
                                            if (cityCheckOperator_b.toLowerCase() === answer.substring(0, 1).toLowerCase()) {
                                                console.log(city.substr(csubs, b).toLowerCase() + " = " + answer.substring(0, 1).toLowerCase() + ' - верно, поехали дальше..');
                                                gameResult = answer.substr(asubs, b).toUpperCase();
                                            } else {
                                                console.log('Вы проиграли,' + '"' + answer.substring(0, 1).toLowerCase() + '"' + ' не та буква');
                                                gameResult = 'lost';
                                                usedTowns = [];
                                            }
                                        }
                                        console.log("Использованные города: " + usedTowns);
                                        getCity(checkCity);
                                    });
                                } else {
                                    cl = cl + 1;
                                    csubs = -city.length + (city.length - cl);
                                    cityCheckOperator_a = city.substr(csubs, b).toUpperCase();
                                    checkCityRemainderCondition(checkCityRemainderConditionEngine)
                                }
                            });
                        } else {
                            console.log('Город уже назывался, вы проиграли');
                            gameResult = 'lost';
                            usedTowns = [];
                            getCity(checkCity);
                        }
                    } else {
                        console.log('Вы проиграли, такого города не существует!');
                        gameResult = 'lost';
                        usedTowns = [];
                        getCity(checkCity);
                    }
                });
            })
        } else {
            al = al + 1;
            asubs = -answerCheckResult.length + (answerCheckResult.length - al);
            gameResult = answerCheckResult.substr(asubs, b).toUpperCase();
            getCity(checkCity);
        }
    });
}

startGame();
