import requests
from datetime import datetime
from random import randint
from urllib.parse import urlparse
from urllib.parse import parse_qs
import json
from data import headers

from flask import Flask, request, render_template, redirect

# TODO: Allow user to sign up for notification by scanning
# slip (record extraction, send notification based on data)
#
# Strategy: get "dataEstrazione" from response to "make_api_request"
# and wait for time to catch up. When time is reached, make new request
# and push out notification.


def parse_link(qr_link: str):
    parsed_url = urlparse(qr_link)
    contest_no = parse_qs(parsed_url.query)["C"][0]
    contest_year = parse_qs(parsed_url.query)["Y"][0]
    contest_id = parse_qs(parsed_url.query)["PrSN"][0]
    return (contest_no, contest_id, contest_year)


def make_api_request(contest_no: str, contest_year: str, contest_id: str, game: str):
    URL = 'https://www.gntn-pgd.it/gntn-info-verifica-schedina-nlp/rest/fe/winforlife' + game

    json_data = {
        'concorso': {
            'numero': contest_no,
            'anno': contest_year,
        },
        'sn': contest_id
    }

    response = requests.post(
        URL,
        headers=headers,
        json=json_data,
    )

    return response.text


def calculate_win_amount(no, id, year, game):
    amount = 0
    resp = make_api_request(no, year, id, game)
    d = json.loads(resp)
    timestamp_concorso = float(d["concorso"]["dataEstrazione"])
    timestamp_ora = datetime.now().timestamp()
    print(f"Concorso: {timestamp_concorso}, ora: {timestamp_ora}")
    if float(d["concorso"]["dataEstrazione"]) > datetime.now().timestamp() * 1000:
        return {'contest': no, 'idschedina': id, 'gioco': game, 'amount': -1}
    unparsed_weens = d["vincita"]
    for ween in unparsed_weens:
        ween_type = ween["tipoDiVincita"]
        amount += int((int(ween_type["count"]) *
                      int(ween_type["valore"])) / 100)
    return {'contest': no, 'idschedina': id, 'gioco': game, 'amount': amount}


app = Flask(__name__)


@app.route('/')
def my_form():
    return render_template('index.html')


@app.route('/checkwin', methods=['POST'])
def checkwin():
    print(request.form)
    form = request.form
    no = form["C"]
    y = form["Y"]
    prsn = form["PrSN"]
    gt = form["game_type"]
    return calculate_win_amount(no, prsn, y, gt)


@app.route('/scanner', methods=['POST'])
def scanner():
    return render_template("scanner.html", gametype=request.form['game'])


@app.route('/winmessage', methods=['POST'])
def winmessage():
    if request.form["win"] == "0":
        return render_template("winmessage.html", amount="Nessuna vincita.")
    else:
        return render_template("winmessage.html", amount=f'Hai vinto: {request.form["win"]}€')


if __name__ == "__main__":
    app.run(ssl_context="adhoc")
