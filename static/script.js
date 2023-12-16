const dict = {"Classico": "classico", "Grattacieli": "grattacieli", "Vinci Casa": ""}
const scanner = new Html5QrcodeScanner('reader', {
    qrbox: {
        height: 250,
        width: 250
    },
    fps: 20,
    aspectRatio: 1
});

function isScannerOn(){
    try {
        scanner.getState();
        return true;
    }
    catch {
        return false;
    }
}
function initializeArchive() {
    let total = 0;
    const data = JSON.parse(localStorage.getItem("savedGames"));
    let outcomeList = document.getElementById('winArchive');

    for (let game of data) {
        let truegame = JSON.parse(game);

        let gioco = truegame['gioco'];
        let contest = truegame['contest'];
        let id = truegame['idschedina'];
        let amount = truegame['amount'];

        let newOutcome = document.createElement('tr');
        let gametd = document.createElement('td');
        let contesttd = document.createElement('td');
        let idtd = document.createElement('td');
        let amounttd = document.createElement('td');

        gametd.innerText = gioco;
        contesttd.innerText = contest;
        idtd.innerText = id;
        amounttd.innerText = amount;

        newOutcome.appendChild(gametd);
        newOutcome.appendChild(contesttd);
        newOutcome.appendChild(idtd);
        newOutcome.appendChild(amounttd);

        outcomeList.appendChild(newOutcome);

        total += amount;
    }
    let winTotal = document.getElementById('winTotal')
    winTotal.innerText = `Vincita totale: ${total}`;
    winTotal.hidden = false;
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

            let game = cg['gioco'];
            let contest = cg['contest'];
            let id = cg['idschedina'];
            let amount = cg['amount'];

            let newOutcome = document.createElement('tr');
            let gametd = document.createElement('td');
            let contesttd = document.createElement('td');
            let idtd = document.createElement('td');
            let amounttd = document.createElement('td');

            gametd.innerText = game;
            contesttd.innerText = contest;
            idtd.innerText = id;
            amounttd.innerText = amount;

            newOutcome.appendChild(gametd);
            newOutcome.appendChild(contesttd);
            newOutcome.appendChild(idtd);
            newOutcome.appendChild(amounttd);

            outcomeList.appendChild(newOutcome);
        }
        let clearButton = document.getElementById('clearWinArchive')
        if (clearButton.hidden == true)
            clearButton.hidden = false;
    }
    let popup = document.getElementById('popup');
    popup.classList.remove('open-popup');
    scanner.render(success, error);
}

function showHidden() {
    const archiveButton = document.getElementById("archiveButton");
    if (archiveButton.classList.contains("activeArchive")){
        archiveButton.classList.remove("activeArchive");
        archive.classList.remove("open-popup");
    }
    if (!isScannerOn())
        scanner.render(success, error);
    document.getElementById('qrReader').hidden = false;
    
}

function success(res) {
    // Should test: call scanner.pause() on success for dramatic effect 8)
    scanner.clear();
    const url = new URL(res);

    const y = url.searchParams.get('Y');
    const c = url.searchParams.get('C');
    const prsn = url.searchParams.get('PrSN');
    const gt = document.getElementsByClassName("nav__link--active")[0].innerText;
    // TODO: Implement way of getting correct string to send out to API out of currently active nav link

    $.ajax({
        type: 'POST',
        url: "/checkwin",
        data: {
            'Y': y,
            'C': c,
            'PrSN': prsn,
            'game_type': gt
        },
        success: function (resp) {
            let winmsg;
            let msg_element = document.getElementById('win-message');
            let popup = document.getElementById('popup');
            let image = document.getElementById('outcome');
            if (resp['amount'] == -1) {
                winmsg = "Estrazione non ancora svolta.";
                image.src = "{{url_for('static', filename='question.png')}}"
                document.getElementById("addButton").hidden = true;
                document.getElementById("skipButton").classList.add("flex-fill")
            }
            else if (resp['amount'] == 0) {
                winmsg = "Schedina non vincente";
                image.src = "{{url_for('static', filename='fail.png')}}"
            }
            else {
                winmsg = "Hai vinto " + resp['amount'] + "€.";
                image.src = "{{url_for('static', filename='tick.png')}}"
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

function toggleArchive(){
    if (archiveButton.classList.contains("activeArchive")){
        archiveButton.classList.remove("activeArchive");
        archive.classList.remove("open-popup")
    }
    else{
        if (!isScannerOn() || isScannerOn() && scanner.getState() != 2){
            let archive = document.getElementById("archive");
            let archiveButton = document.getElementById("archiveButton");
            archiveButton.classList.add("activeArchive");
            archive.classList.add("open-popup");
        }
        if (isScannerOn() && scanner.getState() == 2){
            if (archiveButton)
            spawnSoftAlert("Per visualizzare l'archivio occorre interrompere la scansione.")
        }
    }
}

function spawnSoftAlert(msg){
    alert(msg);
}