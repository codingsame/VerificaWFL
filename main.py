"""Used to parse response from API"""
import json
import re
from datetime import datetime
from urllib.parse import parse_qs, urlparse
from typing import Literal

import requests
from flask import Flask, render_template, request

from data import headers

# TODO: Include case when dataEstrazione has passed but server doesn't return info yet.
# Response example:
# {
# "ricevitoria":null,
# "concorso":null,
# "statoBiglietto":null,
# "combinazioneVincente":null,
# "vincita":[],
# "numeroOpzionale":null,
# "promozione":null,
# "responseStatus":{
#     "code":"2",
#     "descr":null,
#     "message":"Servizio non disponibile. Riprovare piu tardi"
# },
# "bacheca":null,
# "serialNumber":null,
# "sideGames":null,
# "infoGiocata":null,
# "winbox":null,
# "codiceWinbox":null
# }


def detect_game(year: str, card_id: str) -> Literal["classico", "grattacieli", "vincicasa", None]:
    """
    Uses card_id to determine whether the card is valid for a game. If it is, returns the game it
    is valid for.
    """
    games = {
        'se': "superenalotto",
        'svt': "sivincetutto",
        'ej': "eurojackpot",
        'wflvc': "vincicasa",
        'wfl': "winforlifeclassico",
        'wflgr': "winforlifegrattacieli"
    }
    _ = {
        'se': 25,
        'svt': 25,
        'ej': 25,
        'wflvc': 28,
        'wfl': 27,
        'wflgr': 28
    }
    b = {
        'se': 16,
        'svt': 22,
        'ej': 16,
        'wflvc': 16,
        'wfl': 16,
        'wflgr': 16
    }
    m = {
        'se': "11",
        'svt': "11",
        'ej': "08",
        'wflvc': "55",
        'wfl': "05",
        'wflgr': "13"
    }
    p = {
        'se': "26",
        'svt': "25",
        'ej': "24",
        'wflvc': "19",
        'wfl': "20",
        'wflgr': "21"
    }

    annoult = year[2:]

    for siglagioco in ['svt', 'ej', 'wflvc', 'wfl', 'wflgr']:
        regex_string = r'^' + re.escape(annoult) + r'(\w{' + re.escape(str(_[siglagioco]-5)) + r'}|\w{' + re.escape(
            str(b[siglagioco]-5)) + r'})(' + re.escape(m[siglagioco]) + r'|' + re.escape(p[siglagioco]) + r')(\w{1})$'
        if re.match(regex_string, card_id):
            return games[siglagioco]
    return None


def parse_link(qr_link: str) -> tuple[str, str, str]:
    """
    Parses contest number, card id and contest year from QR Code URL.
    """
    parsed_url = urlparse(qr_link)
    contest_no = parse_qs(parsed_url.query)["C"][0]
    contest_year = parse_qs(parsed_url.query)["Y"][0]
    contest_id = parse_qs(parsed_url.query)["PrSN"][0]
    return (contest_no, contest_id, contest_year)


def make_api_request(contest_no: str, contest_year: str, contest_id: str, game: str) -> str:
    """
    Returns response given by lottery API.
    """
    url = 'https://www.gntn-pgd.it/gntn-info-verifica-schedina-nlp/rest/fe/' + game
    json_data = {
        'concorso': {
            'numero': contest_no,
            'anno': contest_year,
        },
        'sn': contest_id
    }
    response = requests.post(
        url,
        headers=headers,
        json=json_data,
        timeout=10
    )
    print(response.text)
    return response.text


def calculate_win_amount(no: str, game_id: str, year: str, game: str) -> dict[str, str | int]:
    """
    Returns useful data to front-end, including contest number,
    card id, contest year and, if extraction has already happened,
    amount of money won. If extraction hasn't happened yet, returns
    -1 as amount.    
    """
    amount = 0
    resp = make_api_request(no, year, game_id, game)
    parsed_response = json.loads(resp)
    try:
        timestamp_concorso = float(
            parsed_response["concorso"]["dataEstrazione"])
    except Exception as e:
        timestamp_concorso = None

    timestamp_ora = datetime.now().timestamp()
    if timestamp_concorso:
        if timestamp_concorso > timestamp_ora * 1000:
            return {'contest': no, 'idschedina': game_id, 'gioco': game, 'amount': -1}
        winnings = parsed_response["vincita"]
        for winning in winnings:
            winning_type = winning["tipoDiVincita"]
            amount += float((float(winning_type["count"]) *
                            float(winning_type["valore"])) / 100)
        return {'contest': no, 'idschedina': game_id, 'gioco': game, 'amount': amount}
    return {'contest': no, 'idschedina': game_id, 'gioco': game, 'amount': -2}


app = Flask(__name__)


@app.route('/')
def my_form():
    """
    Renders main page.
    """
    return render_template('index.html')


@app.route('/checkwin', methods=['POST'])
def checkwin():
    """
    Is called with data retrieved from card's QR Code. Returns
    useful data that's used to fill response to client.
    """
    form = request.form
    no = form["C"]
    y = form["Y"]
    prsn = form["PrSN"]
    gt = detect_game(y, prsn)
    if gt:
        return calculate_win_amount(no, prsn, y, gt)
    return {'contest': no, 'idschedina': prsn, 'gioco': gt, 'amount': -2}


if __name__ == "__main__":
    app.run(ssl_context="adhoc")
