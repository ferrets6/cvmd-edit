# cvmd-edit

Editor web per curriculum vitae in Markdown. Legge e scrive `README.md` (e la foto profilo) di un repo GitHub direttamente tramite le GitHub API. Ospitato su Netlify.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat&logo=netlify&logoColor=white)
![GitHub API](https://img.shields.io/badge/GitHub_API-181717?style=flat&logo=github&logoColor=white)

## Come funziona

- Accesso protetto da password
- Modifica il `README.md` del repo target con un editor Markdown
- Supporta cambio foto profilo (ritaglio circolare automatico + og-image)
- Il salvataggio fa un commit diretto via GitHub API — la GitHub Action del repo target aggiorna il sito

## Configurazione Netlify

Vai su **Site settings → Environment variables** e imposta:

| Variabile | Descrizione | Esempio |
|---|---|---|
| `EDITOR_PASSWORD` | Password per accedere all'editor | `miapassword` |
| `GITHUB_TOKEN` | Personal access token con scope `repo` | `ghp_...` |
| `REPO_OWNER` | Username o organizzazione GitHub | `mariorossi` |
| `REPO_NAME` | Nome del repo da editare | `cvmd-mario` |
| `REPO_BRANCH` | Branch target | `main` |
| `FILE_PATH` | Percorso del file da editare | `README.md` |

### Come generare il GitHub Token

1. GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Genera un token con scope **`repo`**
3. Copia il valore e incollalo in `GITHUB_TOKEN`

## Deploy

1. Collega il repo a Netlify (nessun build step — `publish = "."`)
2. Imposta le variabili d'ambiente (vedi tabella)
3. Deploy

## Sviluppo locale

Richiede [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```bash
npm install -g netlify-cli
cp .env.example .env   # compila le variabili
netlify dev            # avvia su http://localhost:8888
```

`netlify dev` legge le variabili da `.env` e avvia le Netlify Functions in locale, rendendo l'app identica all'ambiente di produzione.
