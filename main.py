import requests
from random import randint
from urllib.parse import urlparse
from urllib.parse import parse_qs
import json
from data import headers

from flask import Flask, request, render_template, redirect


def parse_link(qr_link: str):
    parsed_url = urlparse(qr_link)
    contest_no = parse_qs(parsed_url.query)["C"][0]
    contest_year = parse_qs(parsed_url.query)["Y"][0]
    contest_id = parse_qs(parsed_url.query)["PrSN"][0]
    return (contest_no, contest_id, contest_year)


def check_win(contest_no: str, contest_year: str, contest_id: str, game: str):
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


def final(no, id, year, game):
    amount = 0
    resp = check_win(no, year, id, game)
    d = json.loads(resp)
    unparsed_weens = d["vincita"]
    for ween in unparsed_weens:
        ween_type = ween["tipoDiVincita"]
        amount += int((int(ween_type["count"]) *
                      int(ween_type["valore"])) / 100)
    return amount


app = Flask(__name__)


@app.route('/')
def my_form():
    return render_template('index.html')


# @app.route('/', methods=['POST'])
# def my_form_post():
#     url = request.form['url']
#     game = request.form['game_type']
#     print(url, game)
#     return render_template('index.html', win_message=f"Hai vinto {final(url, game)} €.")


@app.route('/checkwin', methods=['POST'])
def checkwin():
    print(request.form)
    form = request.form
    no = form["C"]
    y = form["Y"]
    prsn = form["PrSN"]
    gt = form["game_type"]
    return {'win': final(no, prsn, y, gt)}


@app.route('/scanner', methods=['POST'])
def scanner():
    return render_template("scanner.html", gametype=request.form['game'])


if __name__ == "__main__":
    app.run()
