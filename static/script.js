const dict = { "winforlifeclassico": "Classico", "winforlifegrattacieli": "Grattacieli", "vincicasa": "VinciCasa", "sivincetutto": "SiVinceTutto" }
let archiveClickable = true;
const scanner = new Html5QrcodeScanner('reader', {
    qrbox: {
        height: 250,
        width: 250
    },
    fps: 20,
    aspectRatio: 1
});

function isScannerOn() {
    try {
        scanner.getState();
        return true;
    }
    catch {
        return false;
    }
}

/**
 * @typedef {Object} Card
 * @property {"classico" | "grattacieli" | "vincicasa" | "sivincetutto" } gioco Can assume values: {'classico', 'grattacieli', 'vincicasa'} 
 * @property {String} contest Contest number for game
 * @property {String} id Indicates identification for specific card
 * @property {string} amount Indicates amount won.
 * Represents a game card.
 */

/**
 * 
 * @param {Card} card 
 * @param {HTMLTableElement} archive 
 * Adds a card to the archive.
 * Parameter archive is altered by this operation (new row is added to it.)
 */
function addCardToArchive(card, archive) {
    let gioco = dict[card['gioco']];
    let contest = card['contest'];
    let id = card['idschedina'];
    let amount = card['amount'];

    let newOutcome = document.createElement('tr');
    let gametd = document.createElement('td');
    let contesttd = document.createElement('td');
    let idtd = document.createElement('td');
    idtd.style.overflowWrap = 'break-word';
    let amounttd = document.createElement('td');

    if (amount > 0)
        amounttd.style.color = "#0F0"
    else
        amounttd.style.color = "#F00"

    gametd.innerText = gioco;
    contesttd.innerText = contest;
    idtd.innerText = id.substring(0, 4) + '...' + id.substring(id.length - 4, id.length);
    amounttd.innerText = amount;
    amounttd.classList.add('amount');

    newOutcome.appendChild(gametd);
    newOutcome.appendChild(contesttd);
    newOutcome.appendChild(idtd);
    newOutcome.appendChild(amounttd);

    archive.appendChild(newOutcome)
}

/**
 * Parses all amounts from table, sums them and updates total amount.
 */
function updateTotalAmount() {
    let total = 0;
    let winnings = document.getElementsByClassName('amount');
    for (let winning of winnings)
        total += parseFloat(winning.innerHTML);
    let winTotal = document.getElementById('winTotal')
    winTotal.innerText = `Vincita totale: ${total.toFixed(2)}€`;
    winTotal.hidden = false;
}

/**
 * Iterates through savedGames in localStorage and adds all records
 * to the archive. This function is called at startup to load all 
 * previous games. Each game is converted to JSON before being 
 * added to the archive.
 */
function initializeArchive() {
    const data = JSON.parse(localStorage.getItem("savedGames"));
    let outcomeList = document.getElementById('winArchive');

    for (let game of data) {
        let truegame = JSON.parse(game);
        addCardToArchive(truegame, outcomeList);
    }

    updateTotalAmount();
}

function clearArchive() {
    let res = confirm("Sei sicuro di voler svuotare l'archivio?");
    if (res) {
        localStorage.setItem("savedGames", "[]");
        location.reload();
    }
}

function closePopup(acceptSaveOutcome) {
    document.getElementById("addButton").hidden = false;
    document.getElementById("skipButton").classList.remove("flex-fill");
    if (acceptSaveOutcome) {
        if (localStorage.getItem("savedGames") === null) {
            localStorage.setItem("savedGames", "[]");
        }

        let currentSavedGames = JSON.parse(localStorage.getItem("savedGames"));
        let gameAlreadyScanned = false;
        for (let game of currentSavedGames) {
            let truegame = JSON.parse(game);
            if (truegame["idschedina"] == JSON.parse(currentGame)["idschedina"])
                gameAlreadyScanned = true;
        }

        if (!gameAlreadyScanned) {
            currentSavedGames.push(currentGame);
            localStorage.setItem("savedGames", JSON.stringify(currentSavedGames));
            let outcomeList = document.getElementById('winArchive');

            let cg = JSON.parse(currentGame);

            addCardToArchive(cg, outcomeList);
            updateTotalAmount();
        }
        let clearButton = document.getElementById('clearWinArchive')
        if (clearButton.hidden == true)
            clearButton.hidden = false;
        document.getElementById("winTotal").hidden = false;

    }
    let popup = document.getElementById('popup');
    popup.classList.remove('open-popup');
    scanner.render(success, error);
    archiveClickable = false;
    setTimeout(() => { archiveClickable = true }, 3000);
}

function showHidden() {
    const archiveButton = document.getElementById("archiveButton");
    if (archiveButton.classList.contains("activeArchive")) {
        archiveButton.classList.remove("activeArchive");
        archive.classList.remove("open-popup");
    }
    if (!isScannerOn())
        scanner.render(success, error);
    document.getElementById('qrReader').hidden = false;

}

function success(res) {
    scanner.clear();
    const url = new URL(res);

    const y = url.searchParams.get('Y');
    const c = url.searchParams.get('C');
    const prsn = url.searchParams.get('PrSN');

    $.ajax({
        type: 'POST',
        url: "/checkwin",
        data: {
            'Y': y,
            'C': c,
            'PrSN': prsn,
            // 'game_type': gt
        },
        success: function (resp) {
            let winmsg;
            let msg_element = document.getElementById('win-message');
            let popup = document.getElementById('popup');
            let image = document.getElementById('outcome');
            let dialogue = document.getElementById('dialogue-msg');
            if (resp['amount'] == -2) {
                winmsg = "Gioco non supportato.";
                image.src = `${window.static_folder}/question.png`;
                dialogue.innerText = 'Questo gioco non è supportato.';
                document.getElementById("addButton").hidden = true;
                document.getElementById("skipButton").classList.add("flex-fill");
            }
            else if (resp['amount'] == -1) {
                winmsg = "Estrazione non ancora svolta.";
                image.src = `${window.static_folder}/question.png`;
                dialogue.innerText = 'Questa estrazione non è stata ancora svolta. Riprova più tardi.';
                document.getElementById("addButton").hidden = true;
                document.getElementById("skipButton").classList.add("flex-fill");
            }
            else if (resp['amount'] == 0) {
                winmsg = "Schedina non vincente";
                dialogue.innerText = 'Vuoi aggiungere questa schedina al tuo archivio?';
                image.src = `${window.static_folder}/fail.png`;
            }
            else {
                winmsg = "Hai vinto " + resp['amount'] + "€.";
                dialogue.innerText = 'Vuoi aggiungere questa schedina al tuo archivio?';
                image.src = `${window.static_folder}/tick.png`;
            }
            msg_element.innerText = winmsg;
            popup.classList.add('open-popup');
            currentGame = JSON.stringify(resp);
        }
    }
    )
}

function error(res) {
}

function setActive(tab) {
    let currentlyActive = document.getElementsByClassName("nav__link--active");
    if (currentlyActive[0])
        currentlyActive[0].classList.remove("nav__link--active");
    tab.classList.add("nav__link--active");
}

function toggleArchive() {
    if (archiveButton.classList.contains("activeArchive")) {
        archiveButton.classList.remove("activeArchive");
        archive.classList.remove("open-popup")
    }
    else {
        if (!isScannerOn() || isScannerOn() && scanner.getState() != 2) {
            if (archiveClickable) {
                let archive = document.getElementById("archive");
                let archiveButton = document.getElementById("archiveButton");
                archiveButton.classList.add("activeArchive");
                archive.classList.add("open-popup");
            }
        }
        if (isScannerOn() && scanner.getState() == 2) {
            if (archiveButton) {
                scanner.pause();
                alert("Per visualizzare l'archivio occorre interrompere la scansione.");
                scanner.resume();
            }
        }
    }
}
