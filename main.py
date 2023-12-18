"""Used to parse response from API"""
import json
from datetime import datetime
from urllib.parse import parse_qs, urlparse

import requests
from flask import Flask, render_template, request

from data import headers


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
    print("URL: ", url)
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
    print("RESPONSE: ", response.text)
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
    d = json.loads(resp)
    timestamp_concorso = float(d["concorso"]["dataEstrazione"])
    timestamp_ora = datetime.now().timestamp()
    if timestamp_concorso > timestamp_ora * 1000:
        return {'contest': no, 'idschedina': game_id, 'gioco': game, 'amount': -1}
    unparsed_weens = d["vincita"]
    for ween in unparsed_weens:
        ween_type = ween["tipoDiVincita"]
        amount += float((float(ween_type["count"]) *
                         float(ween_type["valore"])) / 100)
    return {'contest': no, 'idschedina': game_id, 'gioco': game, 'amount': amount}


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
    gt = form["game_type"]
    return calculate_win_amount(no, prsn, y, gt)


# @app.route('/scanner', methods=['POST'])
# def scanner():
#     return render_template("scanner.html", gametype=request.form['game'])


# @app.route('/winmessage', methods=['POST'])
# def winmessage():
#     if request.form["win"] == "0":
#         return render_template("winmessage.html", amount="Nessuna vincita.")
#     else:
#         return render_template("winmessage.html", amount=f'Hai vinto: {request.form["win"]}€')


if __name__ == "__main__":
    app.run(ssl_context="adhoc")
