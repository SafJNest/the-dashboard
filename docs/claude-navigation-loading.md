# Specifica per Claude — navigazione, dati progressivi e skeleton

Data: 12 novembre 2026. Progetto: Beebot Dashboard, Qwik 2 / Qwik Router 2, attualmente `2.0.0-rc.5`.

## Obiettivo e modalità di lavoro

- Implementare una navigazione reattiva con il minimo JavaScript necessario, conservando SSR e resumability.
- Al click rispondere subito; mantenere le parti condivise; aggiornare soltanto l'area interessata. I dati secondari non devono trattenere il contenuto principale.
- Questo documento descrive il comportamento da ottenere, non funzionalità già implementate o prestazioni misurate. I nomi dei nuovi blocchi sotto sono responsabilità suggerite, non l'obbligo di creare un file per ogni nome.
- Leggere prima `AGENTS.md` e lo stato Git. Preservare le modifiche preesistenti in `alert-settings.tsx`, `settings-form.tsx` e `dashboard.css`, e ricontrollare lo stato prima degli interventi.
- Usare CodeGraph sincronizzato per struttura e dipendenze. Rileggere i file segnalati come modificati dopo l'indicizzazione.
- Non migrare a Svelte o Next. Non aggiungere dipendenze, nuovi servizi, nuove API backend, upload, waveform o funzioni future.
- Mandato: implementare tutti i comportamenti di questa specifica nella dashboard, senza fermarsi a piano o preparazione di agenti. Le verifiche sotto sono a supporto delle modifiche, non autorizzano a costruire un nuovo finto backend completo, infrastrutture di test o benchmark. Usare strumenti esistenti e simulazioni temporanee minime quando servono; segnalare i limiti di verifica senza ampliare l'incarico.
- Non eseguire test, benchmark o richieste sul sito privato, né chiamare Beebot o Discord reali. Le eventuali verifiche runtime sono locali, con dati fittizi e senza caricare credenziali reali; devono restare proporzionate alle modifiche richieste.
- Seguire le decisioni confermate sotto. Per un nuovo dubbio di prodotto che cambia il comportamento, chiedere all'utente e proseguire sulle parti indipendenti; non inventare la risposta.

## Decisioni confermate dall'utente

- Accesso diretto o refresh: in generale HTML SSR con contenuto principale completo; analytics e contenuti secondari possono arrivare dopo. Applicare la priorità nel contesto di ciascuna pagina, come specificato sotto.
- La sidebar delle impostazioni esiste soltanto nei Settings. Passando a Sounds scompare; non introdurre una sidebar comune nuova.
- Prima di una navigazione che perderebbe modifiche non salvate, avvisare l'utente.
- La libreria mostra subito i suoni con un ordine stabile. L'ordine per riproduzioni nel periodo viene applicato soltanto quando richiesto.
- L'audio continua cambiando dettaglio nella stessa libreria; si ferma quando si esce dalla libreria.
- Le selezioni di entità (streamer, livello reward e guild nella libreria personale) usano segmenti del percorso, non `?streamer=`, `?level=` o `?guild=`. La forma precisa dei percorsi sotto è la proposta implementativa per applicare questa preferenza.

## Regole valide per ogni combinazione di navigazione

- Distinguere accesso documento (URL incollata, refresh, nuova scheda, redirect esterno) da navigazione interna gestita dal router.
- Primo accesso: nessuna promessa di risposta visiva prima che la rete restituisca HTML. Non spostare il caricamento principale in un effetto client per far sembrare rapido il server.
- Navigazione interna: feedback sul controllo attivato appena l'evento viene gestito; struttura di destinazione appena il codice necessario è disponibile; skeleton solo nelle regioni che non hanno dati corretti.
- Dati e codice già disponibili: renderizzare direttamente. Nessun ritardo minimo per rendere visibile un loader, nessuna animazione da attendere prima di navigare.
- Dati mancanti: mostrare skeleton nella loro area. Una risposta vuota confermata è uno stato vuoto, un errore è uno stato di errore; nessuno dei due è uno skeleton infinito.
- Richieste indipendenti partono in parallelo. La comparsa dei risultati deve essere indipendente: non riunire elenco e analytics in un unico `await Promise.all` che ne obbliga la pubblicazione insieme.
- Non aspettare il completamento del contenuto principale per avviare una richiesta secondaria già autorizzata e indipendente. Differire la visualizzazione non significa serializzare le chiamate.
- Non mostrare contenuti della guild A sotto il nome della guild B, né statistiche del suono A sotto il titolo di B.
- Stessa identità e stessi parametri: durante una rivalidazione si può conservare il risultato precedente, con indicazione locale di aggiornamento. Identità o ambito diversi: skeleton nella regione interessata, salvo dati già validi per la nuova destinazione.
- Per cambio periodo, il contenuto principale stabile resta; grafici del periodo precedente possono restare soltanto se chiaramente etichettati con il vecchio periodo e come in aggiornamento. Altrimenti skeleton del grafico.
- Le risposte tardive non devono sovrascrivere una selezione, un periodo, una guild o una sessione più recenti. Usare cancellazione quando disponibile e controllo della chiave della richiesta prima di applicare i risultati.
- Tornare indietro/avanti ripristina URL, selezione, filtri e scroll appropriati senza azzerare tutto. La cache può evitare la rete, ma non è garanzia di freschezza o autorizzazione permanente.
- Un link alla destinazione già attiva non forza richieste o reset. Un comando esplicito di retry/aggiornamento invece rivalida il necessario.
- `aria-current` rappresenta la destinazione effettivamente attiva; un eventuale stato sul link richiesto è separato e temporaneo. Se il cambio fallisce, rimuovere quello stato e mostrare il fallimento.
- Le transizioni visive non devono bloccare il primo aggiornamento utile. Evitare dissolvenza dell'intera dashboard per ogni richiesta locale.
- Se una scelta del browser apre una nuova scheda, preservare il comportamento nativo del link e applicare la modalità di accesso diretto nella nuova scheda.

## Confini dei layout e dei componenti

- `src/root.tsx`: documento, head e router. Nessun caricamento Beebot globale. Non rimontare il documento durante navigazioni interne.
- `src/routes/dashboard/layout.tsx`: struttura autenticata comune e `AppHeader`. Account condiviso, azioni già comuni, regione centrale annidata. Il caricamento delle analytics non deve risalire fino all'header.
- `src/routes/dashboard/[guildId]/layout.tsx`: contesto guild, `GuildSwitcher`, breadcrumb e tab Settings/Sounds. Resta montato tra sezioni della stessa guild; cambia identità quando cambia guild.
- `src/routes/dashboard/[guildId]/settings/layout.tsx`: `SettingsNav` e area principale. Sidebar persistente tra sezioni Settings della stessa guild; smontata uscendo dai Settings.
- Layout Sounds della guild e gruppo personale `(library)`: proprietari di elenco, ricerca, scroll, audio e selezione. Persistono cambiando soltanto soundId o parametri locali. Sono due librerie distinte: il passaggio dall'una all'altra è un'uscita.
- Route editor: fuori dal gruppo `(library)`, come oggi. Non caricare la libreria completa per modificare un singolo suono.
- Componenti foglia: leggono solo i dati necessari alla propria area. Evitare un modello obbligatoriamente completo che renda l'elenco dipendente dai grafici.
- Context Qwik soltanto per dati condivisi da più discendenti, collocato nel layout proprietario; props per configurazione locale. Non creare un secondo store globale concorrente con loader e URL.
- “Resta fisso” significa persistente nella navigazione, non l'aggiunta indiscriminata di `position: fixed`. Conservare il comportamento responsive e sticky esistente.

## Inventario delle URL

| URL | Contenuto principale SSR | Differibile |
| --- | --- | --- |
| `/` | Landing completa, header, CTA, footer | Nessun dato applicativo secondario; nessuna chiamata dashboard |
| `/dashboard/` | Account e lista server, oppure stato vuoto | Nessun dato applicativo secondario da differire |
| `/dashboard/{guildId}/` | Redirect coerente verso Settings | Nessun contenuto da duplicare |
| `/dashboard/{guildId}/settings/` | Contesto guild, sidebar e panoramica | Nessuna analytics |
| `/dashboard/{guildId}/settings/{section}/` | Contesto, sidebar e sezione completa | Nessuna chiamata secondaria obbligatoria |
| `/dashboard/{guildId}/settings/rewards/{level}/` | Struttura Settings, elenco livelli e form del reward richiesto | Nessuno |
| `/dashboard/{guildId}/settings/twitch/{streamerId}/` | Struttura Settings, elenco streamer e form richiesto | Nessuno |
| `/dashboard/{guildId}/sounds/` | Contesto e libreria, identità del suono selezionato se esiste | Analytics e overview |
| `/dashboard/{guildId}/sounds/{soundId}/` | Libreria e dettaglio base del suono richiesto | Analytics del dettaglio e overview |
| `/dashboard/me/` | Redirect verso libreria personale | Nessuno |
| `/dashboard/me/sounds/` | Account, libreria personale e dettaglio base se selezionato | Analytics e overview |
| `/dashboard/me/sounds/{soundId}/` | Libreria personale e dettaglio base richiesto | Analytics del dettaglio e overview |
| `/dashboard/me/sounds/guild/{guildId}/` | Libreria personale limitata ai propri upload di quella guild | Analytics e overview dell'ambito selezionato |
| `/dashboard/me/sounds/guild/{guildId}/{soundId}/` | Libreria personale filtrata e dettaglio base richiesto | Analytics del dettaglio e overview |
| `/dashboard/me/sounds/{soundId}/edit/` | Identità, permessi e form del suono | Suggerimenti dei tag soltanto mentre si scrive |
| `/auth/login/`, `/auth/callback/` | Flusso di redirect e relativi errori | Nessun caricamento decorativo |
| `/auth/logout/` | POST, revoca e redirect | Nessuno |

## Percorsi delle selezioni e compatibilità

- I percorsi di questa specifica sono destinazioni frontend da implementare; al momento reward, streamer e filtro guild personale usano ancora query. Non descrivere la migrazione come già eseguita.
- Usare `/settings/rewards/{level}/` e `/settings/twitch/{streamerId}/` dentro il percorso completo della guild. La route generica `[section]` non deve intercettare o rendere vuote queste sottoroute.
- Per My sounds usare il segmento statico `guild` prima del guildId: `/dashboard/me/sounds/guild/{guildId}/`. Evita di confondere un guildId con il soundId numerico di `/dashboard/me/sounds/{soundId}/`.
- Le route personali filtrate restano sotto lo stesso layout proprietario della libreria personale: passare tra All servers e una guild selezionata non rimonta elenco/player e non equivale ad aprire `/dashboard/{guildId}/sounds/`.
- All servers personali resta `/dashboard/me/sounds/`. Un link a un dettaglio mentre è attivo un filtro usa `/dashboard/me/sounds/guild/{guildId}/{soundId}/`, conservando quel filtro nel percorso.
- Periodo, tab, owner e ordinamento restano qui parametri di presentazione già descritti separatamente; la preferenza espressa riguarda gli identificativi delle entità. Non spostare anche questi parametri senza una richiesta ulteriore.
- Per i vecchi link con `?level=`, `?streamer=` e `?guild=`, normalizzare alla nuova URL preservando solo gli altri parametri compatibili. Non duplicare due fonti di verità né creare redirect sulle richieste interne dei loader. Se percorso e vecchia query sono entrambi presenti, prevale il percorso e si rimuove la query obsoleta.
- Cambiare URL non impone di cambiare endpoint backend o di fare una nuova richiesta. Parametri del router e chiavi dei dati sono responsabilità distinte.

## Home — SiteHeader, Hero, Features, CallToAction, SiteFooter

- URL: `/`. Accesso diretto: conservare la generazione statica della landing e l'HTML completo; nessun loader Beebot o account soltanto per mostrarla.
- Header, titoli, testo, navigazione e CTA disponibili nell'HTML. Invito Discord derivato dalla configurazione già prevista; non aggiungere fetch client per ottenerlo.
- Navigazione alle ancore: comportamento locale, nessun loader di pagina o API. Gestire l'ancora anche nell'accesso diretto.
- Login/Manage your hives: destinazione `/dashboard/`, controllo della sessione server; senza sessione parte il login esistente.
- Link Discord ed esterni restano normali link. Non intercettare il protocollo OAuth come navigazione SPA.
- Link a pagine future non implementate non devono far credere che esista contenuto o un caricamento infinito. Conservare il comportamento attuale o rendere esplicita l'indisponibilità, senza realizzare nuove pagine.
- `BeeDefs`, `HexMark`, illustrazioni e icone: nessuna richiesta dati, skeleton o effetto client dedicato. Animazioni CSS e rispetto di reduced motion.
- Tornando dalla dashboard alla home, rimuovere il contesto privato dalla UI e fermare l'audio. Non mantenere un player globale.

## Autenticazione — login, callback, logout e guardie

- Le chiamate Beebot restano lato server tramite `BeebotClient`/`sessionFetch`. Chiave API e token non devono raggiungere bundle, HTML serializzato o log.
- Chiave del sito e sessione utente sono credenziali della stessa chiamata: non aggiungere una richiesta di autenticazione distinta per ogni widget.
- Assenza del cookie: redirect al login prima di contenuti privati. Presenza del cookie non equivale a validazione della sessione o dei permessi.
- Controlli che devono decidere 401/403/404/redirect dell'accesso diretto restano nel percorso bloccante; non trasferirli tutti in loader background per guadagnare TTFB.
- Login e callback conservano controlli state, cookie e scambio server-to-server. Nessun prefetch delle URL che avviano o modificano la transazione OAuth.
- Logout: solo POST, stato “uscita in corso” sul pulsante, prevenzione invii duplicati, nessun successo prima della risposta. Revocare la sessione, eliminare il cookie e pulire lo stato privato riutilizzabile; su fallimento mostrare errore senza simulare l'uscita.
- 401 di sessione durante una richiesta: gestire centralmente una sola uscita verso login, interrompendo le operazioni private ancora pendenti. Non generare più redirect concorrenti.
- `invalid_api_key`: errore di configurazione, non tentativo di login ripetuto.
- Revoca dei permessi: nessuna azione autorizzata soltanto perché la UI o la cache mostrano ancora un vecchio permesso; backend resta autoritativo.

## AppHeader e indicatore di navigazione

- Presente in tutte le URL `/dashboard/**`; stabile passando da server list a guild, Settings, Sounds personali ed editor.
- Accesso diretto: account necessario nell'HTML principale. Non aspettare analytics per nome o avatar dell'utente.
- Navigazione interna: riutilizzare account disponibile senza nascondere l'header o sostituirlo con skeleton.
- Cambia soltanto la voce attiva, oltre ai dati account effettivamente aggiornati. Non cambiare nome/foto in risposta a una richiesta partita con una vecchia sessione.
- Il click su Servers o My sounds riceve feedback locale anche quando il codice o il dato di destinazione non è ancora pronto.
- Usare la barra esistente per una vera transizione di route ancora incompleta; uno skeleton locale continua a rappresentare una analytics lenta anche dopo che la route è stata mostrata. Non equiparare `isNavigating` a tutte le richieste pendenti.
- Salvataggio, voto, greet, suggerimenti tag e caricamento audio non devono accendere il loader dell'intera pagina.
- Evitare il ritardo attuale di feedback basato sull'attenuazione generale dopo 400 ms come unica risposta al click. Conservare una soglia breve solo per indicatori secondari anti-lampeggio, mai per posticipare contenuto disponibile.
- Il loader deve terminare anche su errore, annullamento, redirect e nuova navigazione; nessun overlay che blocchi header e navigazione.

## Lista server — Servers e GuildAvatar

- URL: `/dashboard/`. Dati da `useAccount` / `/me`; non richiamare anche `/servers` o `/guilds` per la stessa lista.
- Accesso diretto: lista completa nell'HTML SSR, oppure stato vuoto confermato. Gli URL degli avatar sono inclusi nei dati principali; non creare un loader separato per ottenerli. Il download delle immagini è gestito dal browser ed è distinto dal caricamento progressivo applicativo. Dimensioni riservate e fallback testuale evitano spostamenti; eventuale lazy loading riguarda solo immagini fuori schermo, non tutte le immagini indiscriminatamente.
- Arrivo interno con account disponibile: mostrare subito le card, senza attendere dati della guild non ancora selezionata.
- Click su una card: header comune resta; feedback sulla card; contesto e centro della guild di destinazione appena disponibili. Non mostrare le impostazioni di un'altra guild come se fossero quelle richieste.
- Conversione dei normali `<a>` interni in navigazione router soltanto dopo aver risolto gli errori descritti sotto. Oggi il reload è intenzionale, non una semplice svista.
- Server senza bot o non più accessibile: errore di destinazione e possibilità di tornare alla lista, non card bloccata in caricamento.

## Contesto guild — GuildSwitcher, breadcrumb e tab Settings/Sounds

- URL: `/dashboard/{guildId}/**`. Identità guild, icona, dati e permessi da una fonte canonica per quella guild.
- Stessa guild, Settings ↔ Sounds: `AppHeader` e barra guild persistono. Cambia la zona sotto la barra; la sidebar Settings viene aggiunta o rimossa secondo la destinazione.
- Stessa guild, Welcome ↔ Leave e altre sezioni: non ricostruire barra guild o sidebar.
- Cambio guild dal selettore: mantenere l'header account. Segnalare la destinazione selezionata; mostrare skeleton nel contenuto della nuova guild se non disponibile. Non lasciare modificabili i dati della guild precedente sotto il nuovo titolo.
- Destinazione del selettore: da Sounds aprire Sounds della nuova guild; da una sezione Settings mantenere la stessa sezione; dalla panoramica Settings mantenere la panoramica. Non trasferire soundId, streamer o reward di una guild all'altra.
- Il selettore usa i server dell'account già caricato. Aprire il menu, Escape e click esterno sono operazioni locali senza rete.
- “All servers” torna a `/dashboard/` con navigazione interna e senza richiedere il dettaglio di altre guild.
- Route `/dashboard/{guildId}/`: normalizzazione verso `/settings/` anche nella navigazione interna; le richieste interne dei loader non devono essere intercettate dal redirect. Non lasciare una route centrale vuota.
- Tab Leaderboard e Soundboards attualmente disabilitati restano tali: nessun prefetch, loader o nuova API per essi.

## SettingsNav e panoramica Settings

- URL: `/dashboard/{guildId}/settings/` e tutte le sottosezioni.
- Accesso diretto: sidebar, voce attiva, badge e pagina principale già SSR dopo il caricamento della guild.
- Arrivo interno da un'altra sezione Settings: sidebar e suo scroll persistono; cambia solo il centro e la voce attiva.
- Arrivo da Sounds della stessa guild: ricreare la sidebar Settings, riutilizzando dati guild disponibili. Non ricreare header e barra guild.
- Titoli e descrizioni delle sezioni sono statici; badge dipendono dai dati. In caso di dati ancora mancanti, skeleton nei badge e nel form, non valori On/Off inventati.
- Tutte le sezioni leggono la stessa risposta guild già disponibile: non aggiungere un endpoint per Welcome, uno per Leave, uno per i canali, ecc.
- Se il dato deve essere rivalidato, non sostituire una bozza dirty con la risposta. Separare snapshot salvato e valori in modifica.
- Overview Settings: card e badge da dati guild, nessuna analytics. Link alle sezioni con URL reali e navigazione interna.

## SettingsForm, SectionIntro e dock di salvataggio

- URL: sezioni modificabili e form annidati di reward/Twitch. `SectionIntro` statico, form e validità dipendenti dal dato corretto.
- Form non ancora disponibile durante una navigazione: skeleton con geometria simile; non input abilitati con valori di default fittizi.
- Prima modifica: mostrare il dock. Nessuna chiamata backend a ogni input, toggle o aggiornamento della preview.
- Save: loader sul pulsante/dock, disabilitazione degli invii concorrenti e dei controlli che potrebbero alterare il payload in volo; mantenere la struttura e i valori visibili.
- Inviare soltanto la sezione e i cambiamenti previsti dal contratto. Non invalidare account, libreria e analytics per un salvataggio Settings.
- Successo: mostrare conferma solo dopo risposta valida; riallineare snapshot, valori e badge alla fonte confermata. Se occorre rivalidare la guild, mantenere il form senza flash e senza ripetere la stessa invalidazione più volte.
- Errore di campo o risposta parzialmente fallita: mantenere input e dock; associare gli errori alla sezione/chiave corretta. Non mostrare “salvato” perché il POST HTTP è 200 se il payload segnala fallimento.
- Errore di rete: messaggio locale e retry esplicito. Non rimandare automaticamente un POST il cui esito è incerto.
- Reset: operazione locale verso l'ultimo snapshot confermato; nessuna richiesta e nessun refresh completo.
- Prima di perdere una bozza: avviso per cambio sezione, guild, livello reward, streamer, altri parametri che cambiano form, uscita da Settings, back/forward e chiusura/refresh quando il browser lo consente. Annullare la navigazione mantiene URL, valori, focus e pagina.
- Se l'utente conferma l'uscita, scartare la bozza di quel form. Non introdurre persistenza in localStorage o un sistema automatico di bozze.
- Se si naviga mentre il salvataggio è in corso, mostrare nell'avviso anche che l'operazione potrebbe concludersi dopo l'uscita. Annullare la navigazione mantiene il form; confermare permette l'uscita senza dichiarare annullata sul backend un'operazione già inviata. Una risposta tardiva aggiorna soltanto i dati della propria identità, non il form di destinazione. I redirect obbligati per sessione scaduta non devono essere bloccati da un avviso dirty.
- Non usare remount del layout per resettare un form. Chiavi e reset limitati all'identità guild/sezione/item effettivamente cambiata.

## AlertSettings / AlertForm — Welcome, Leave, Boost e Level-up

- URL: `/settings/welcome/`, `/settings/leave/`, `/settings/boost/`, `/settings/level-up/`, sempre nel contesto guild.
- Accesso diretto: impostazione corrente, valori, problemi di validità e preview inclusi nel contenuto principale SSR.
- Navigazione tra queste URL: header, barra guild e sidebar persistono; il centro cambia immediatamente se dati e codice sono pronti. Nessuna analytics o nuova richiesta applicativa necessaria per rileggere la stessa guild.
- Welcome: messaggio, canale, invio privato e ruoli secondo configurazione esistente; Leave non deve ereditare i ruoli o il testo della pagina Welcome.
- Boost: propri dati e ruoli; Level-up: proprio messaggio e variabili, senza aggiungere un selettore canale che il componente non prevede.
- Testo, modalità di invio, token delle variabili e anteprima Discord: aggiornamento locale. Nessun loader per calcolare una preview.
- Dati mancanti perché ancora in caricamento non equivalgono a impostazione assente. Usare `emptyAlert()` solo dopo aver ricevuto una risposta che ne confermi l'assenza.
- Canali eliminati, ruoli mancanti e impostazioni non valide restano rappresentati con avvisi; non correggere o cancellare silenziosamente i valori persistiti.
- Applicare il comportamento SettingsForm per salvataggio, reset e perdita modifiche.

## ExperienceSettings

- URL: `/settings/experience/`. SSR con stato XP, tabella canali, moltiplicatori e link Level-up/Rewards.
- Navigazione interna: riusare canali, ruoli e impostazioni della guild. Nessuna fetch per ogni riga o apertura di un controllo.
- Toggle e moltiplicatori: modifica locale; salvataggio invia solo i canali modificati come previsto oggi.
- Link Level-up/Rewards: cambio del centro e avviso dirty quando necessario; non ricaricare la struttura.
- Se la tabella è grande, ottimizzare markup/lavoro locale sulla base di evidenze. Non introdurre paginazione backend inesistente o eliminare campi dal form alterando il payload.

## RewardSettings

- URL: `/dashboard/{guildId}/settings/rewards/` e `/dashboard/{guildId}/settings/rewards/{level}/`.
- Accesso diretto: elenco livelli e form del livello valido richiesto; sulla URL base usare il primo livello secondo l'ordine numerico attuale.
- Cambio livello: tenere elenco e layout, cambiare solo il form/preview e il segmento level; dati già nella guild, nessuna richiesta aggiuntiva. Applicare avviso dirty.
- Livello esplicito non presente: 404 in accesso diretto, errore di selezione nel centro in navigazione interna. Non mostrare il primo reward sotto il percorso di un altro livello e non crearne uno nuovo.
- Nessun reward: stato vuoto con istruzione Discord, non skeleton né form fittizio.
- Conservare ruoli, messaggio e temporary secondo contratto esistente. Creazione e rimozione non disponibili restano fuori scope.

## TwitchSettings

- URL: `/dashboard/{guildId}/settings/twitch/` e `/dashboard/{guildId}/settings/twitch/{streamerId}/`.
- Accesso diretto: elenco streamer e form della selezione valida; sulla URL base usare il primo streamer disponibile. Uno streamerId esplicito inesistente produce 404 SSR o errore locale di selezione, non il form di un altro streamer.
- Cambio streamer: elenco persistente, cambia solo alert/preview, avviso dirty; nessuna chiamata Twitch per risolvere il nome o per navigare tra impostazioni già scaricate.
- Continuare a mostrare gli ID quando il backend non fornisce nomi. Non introdurre una catena di richieste per abbellire il selettore.
- Nessuno streamer: stato vuoto e comando Discord. Non mantenere loader in attesa di contenuti che non esistono.
- Salvataggio riguarda solo lo streamer selezionato; una risposta tardiva non deve mostrare conferme nel form di un altro streamer.

## ModerationSettings

- URL: `/settings/moderation/`. Tabella azioni automatiche da dati guild, SSR e navigazione interna immediata quando disponibili.
- Componente attualmente di lettura: nessun dock di salvataggio, POST o spinner per cambiare sezione.
- Stato vuoto confermato e istruzioni Discord per aggiungere/rimuovere azioni. Non creare un editor di moderazione in questo intervento.

## BlacklistSettings e GeneralSettings

- URL Blacklist: `/settings/blacklist/`; URL General: `/settings/general/`.
- SSR completo dei valori. Navigazione interna cambia solo il centro usando lo snapshot guild.
- Blacklist: toggle, soglia e canale locali fino a Save; nessuna interrogazione della blacklist reale per visualizzare le impostazioni.
- General: prefisso, lingua, voce e regione dai dati già presenti; le opzioni regione sono costanti locali. Nessun servizio TTS/League interrogato per aprire il form.
- Applicare SettingsForm, inclusi errori locali e avviso dirty.

## Combo, ChannelPicker e RolePicker

- Controlli usati dentro i form Settings: opzioni da canali e ruoli della guild già autorizzata.
- Accesso diretto: valore selezionato e controlli semanticamente corretti nell'HTML SSR; non attendere l'apertura per scoprire il valore corrente.
- Apertura, ricerca, selezione, Clear, Done, Escape e click esterno: nessuna rete; codice interattivo caricato/prefetchato secondo Qwik.
- Una scelta aggiorna il form e la preview; non salva automaticamente.
- Canale/ruolo mancante: rappresentarlo e conservarlo finché l'utente non lo cambia. Ruoli non assegnabili rispettano `assignable` e permessi correnti.
- Se il dato guild non è arrivato, skeleton del controllo o del form, non “No roles”/“No channel” spacciato per valore salvato.
- Mantenere tastiera, focus e cleanup dei listener; evitare nuovi listener globali duplicati a ogni cambio sezione.

## SoundLibrary — struttura e separazione dei dati

- URL: entrambe le librerie, con e senza soundId. Conservare due ambiti distinti: guild e personale.
- Separare responsabilità: struttura/titolo/filtri; elenco; identità e azioni base del suono; statistiche; overview; player audio.
- Oggi `useGuildSounds` e `useMySounds` uniscono library e analytics, e `LibraryModel`, `guildLibraryModel`, `myLibraryModel` richiedono entrambe. Rimuovere questa dipendenza prima di mettere un `Pending`: se il parent legge il dato analytics, blocca comunque i figli.
- Rendere i modelli canonici coerenti con le due risposte. Non duplicare tutte le entità in una seconda rappresentazione concorrente solo per gestire loading.
- Primo accesso: account, contesto guild quando applicabile, elenco, filtri e dettaglio base selezionato nel contenuto principale SSR. Analytics non devono trattenere questo contenuto.
- Navigazione interna senza dati: titolo e struttura, skeleton elenco e dettaglio base; analytics con skeleton indipendente. Con libreria valida in cache: elenco e dettaglio base subito.
- Library e analytics partono in parallelo quando disponibili autorizzazione e parametri. La priorità riguarda cosa blocca rendering e usabilità, non una cascata artificiale di richieste.
- I riepiloghi già inclusi nella risposta library possono apparire con essa. Dati disponibili soltanto nell'analytics hanno un loro stato pending. Non trattare tutti i numeri come se provenissero dallo stesso endpoint.
- Se la risposta library è essa stessa lenta perché il backend vi calcola summary, separare i loader non può anticipare i suoi suoni: documentare il limite, non inventare una nuova API o promettere il contrario.
- Analytics fallite: elenco, metadati, player e azioni restano utilizzabili; errore/retry solo nell'area analytics. Library fallita: errore della libreria e nessun falso elenco vuoto.
- Entrare nella libreria non deve scaricare gli audio. Conservare `preload="none"`.

## Libreria Sounds della guild

- URL: `/dashboard/{guildId}/sounds/`, `/dashboard/{guildId}/sounds/{soundId}/`.
- Dati principali: `guildSounds(guildId, period)`; secondari: `guildSoundAnalytics(guildId, period)`. Riutilizzare `BeebotClient` ed endpoint esistenti.
- Arrivo da Settings della stessa guild: header e barra guild restano; sidebar Settings scompare; centro passa alla libreria e ai relativi skeleton locali.
- Cambio guild: nuova identità e nuovi dati; fermare l'audio della vecchia libreria. Non riusare i dati di una guild diversa.
- `?owner=mine|others` filtra la libreria già ricevuta, senza refetch. All è il valore di default.
- Conservare il vincolo attuale di accesso alla gestione guild imposto dal layout. Non trasformare l'intervento prestazioni in un cambiamento dei permessi della pagina.
- Se si applica un filtro che elimina la selezione corrente, mostrare la prima voce dell'insieme filtrato come comportamento di apertura base attuale; se non ne rimane nessuna, stato vuoto. Nessun ID di suono precedente riutilizzato per sbaglio.

## Libreria personale — My sounds e GuildPicker

- URL: `/dashboard/me/sounds/`, `/dashboard/me/sounds/{soundId}/`, `/dashboard/me/sounds/guild/{guildId}/` e `/dashboard/me/sounds/guild/{guildId}/{soundId}/`; alias `/dashboard/me/` normalizzato verso la libreria.
- Dati principali: `mySounds(period)`; secondari: `mySoundAnalytics(period)`. Non caricare il dettaglio Settings di ogni guild di origine.
- Mostrare i propri upload raggruppati/identificati con le informazioni già restituite. Guild non disponibile conserva l'etichetta fallback attuale; nessuna fetch per ogni nome.
- `GuildPicker` seleziona `/dashboard/me/sounds/guild/{guildId}/` usando i gruppi già ricevuti da `mySounds(period)`. Mostra solo i propri upload provenienti da quella guild; non include i suoni degli altri membri.
- Esempio: la risposta personale contiene i miei upload di A e B. Selezionare A limita elenco e vista analytics ad A usando i dati personali già caricati. Non richiede impostazioni, canali, ruoli o permessi amministrativi di A, quindi non chiama `GET /guilds/{id}` e non apre la dashboard amministrativa di A.
- All servers personali rimuove il segmento `guild/{guildId}` e torna a `/dashboard/me/sounds/`. Non va confuso con il link Servers dell'header, che apre `/dashboard/`.
- GuildId esplicito non presente nei gruppi personali ricevuti: stato di selezione non disponibile con link ad All servers, senza caricare le impostazioni della guild o mostrare silenziosamente dati di un altro ambito. Distinguere gruppo vuoto confermato da dati ancora pendenti o richiesta fallita.
- Arrivo da Sounds guild o ritorno a Sounds guild: mantenere `AppHeader`, sostituire contesto/libreria. È cambio di ambito: fermare l'audio e non riusare statistiche del vecchio ambito.
- La libreria personale oggi ordina per statistiche del periodo: adeguare questo punto alla scelta dell'utente descritta sotto, evitando di aspettare analytics per costruire `entries`.

## SoundList — ricerca, ordine, selezione e Load more

- Mostrare nomi, autore/origine, durata, tag necessari alla ricerca e possibilità di riproduzione appena la library è pronta.
- Default stabile proposto: nome crescente, poi ID come spareggio deterministico. Applicarlo su server e client allo stesso modo; non riordinare automaticamente all'arrivo delle analytics. Rendere la label coerente: non lasciare “Most played” su un elenco alfabetico.
- Aggiungere soltanto il controllo minimo per richiedere esplicitamente l'ordine “Riproduzioni nel periodo”. Il nome del parametro URL, ad esempio `sort=name|plays`, è una scelta frontend: non è un nuovo parametro da inviare al backend.
- In ordine per periodo richiesto: se analytics già presenti, ordinare subito; altrimenti mantenere l'elenco stabile visibile con indicatore locale di ordinamento in corso, poi applicare l'ordine richiesto. Se errore, elenco utilizzabile e errore locale, senza fingere ordinamento completato.
- Contatori delle righe dipendenti dal periodo: skeleton numerico o indicazione non disponibile finché manca il dato. Mai usare zero come sinonimo di loading o contatori lifetime sotto la label del periodo.
- Ricerca per nome/tag: locale sui dati già scaricati, nessuna rete; non azzerarla cambiando suono. A input di ricerca aggiornare il limite delle righe come oggi.
- “Load more” attuale mostra altre righe di un elenco già scaricato (40 per volta): niente richiesta o spinner di rete fittizio. Non presentarlo come paginazione backend.
- Click sulla riga: modifica il path soundId mantenendo l'eventuale segmento `guild/{guildId}` della libreria personale; conserva lista, ricerca, numero righe e scroll; cambia dettaglio base e analytics relative alla selezione.
- Click Play: riproduce senza dover cambiare selezione o attendere analytics. Non usare il loader di pagina per il buffering.
- Elementi di lista con identità stabile, senza key che dipenda da periodo o stato analytics e rimonti l'intero elenco.

## SoundDetail — identità, metadati e azioni

- Separare il blocco base (nome, uploader, guild origine, durata, data, visibilità, tag, player e azioni consentite) dalle analytics.
- Primo accesso a un soundId: dettaglio base del suono richiesto nell'SSR insieme alla libreria; grafici successivi.
- Cambio soundId nella stessa libreria: base dal dato già presente, senza skeleton del nome se è disponibile; solo analytics non disponibili mostrano pending. Elenco e overview generale non si azzerano.
- Nessuna richiesta `sound(soundId)` aggiuntiva se la library contiene già il dettaglio base necessario. Non aggiungere fetch per ogni riga per preparare il dettaglio.
- Se il suono manca dalla libreria autorizzata, non mostrare silenziosamente il primo elemento sotto una URL con un altro ID: su accesso diretto stato 404 appropriato; in navigazione errore locale con via di ritorno alla libreria. La selezione predefinita del primo elemento vale per la URL base, non per un soundId esplicito inesistente.
- Una selezione resa incompatibile da un filtro va gestita esplicitamente: i link dei filtri possono tornare alla URL base come oggi; non lasciare il path di un suono e renderizzare un altro suono.
- Download usa il link audio esistente e non richiede analytics. Edit disponibile solo secondo i permessi ricevuti.
- La label/title del documento dipende da nome guild/suono principale, non dalle analytics; eliminare eventuali attese delle analytics dentro `head`/`resolveValue`.

## Analytics del dettaglio, tab Everyone/Your plays e cronologia

- Regioni autonome: riepiloghi del suono, DayBars, HeatGrid, SourceSplit, ReplaySplit e cronologia personale.
- Usare prima i dati batch già restituiti dagli endpoint analytics della libreria. Oggi contengono statistiche per più suoni: non introdurre un'ulteriore richiesta per ogni click se il dato è già nel batch.
- Il metodo `soundAnalytics(soundId, ...)` esiste, ma la sua esistenza non giustifica automaticamente aggiungere fetch per dettaglio sopra le richieste batch. Scegliere una sola strategia per un dato/ambito; cambiare strategia solo con contratto verificato e necessità dimostrata.
- Dati batch pronti: cambio suono e tab immediati con elaborazione locale. Batch pendente: mini loader nel pannello analytics, identità e azioni base utilizzabili.
- Tab `?tab=mine`: cambia solo pannello analytics e URL, non elenco, header o player. Non richiede una seconda copia delle analytics se la risposta corrente contiene già `my`.
- Cronologia personale: resta privata e limitata agli eventi ricevuti. Non confondere eventi non scaricati con assenza di riproduzioni.
- Attualmente si mostrano fino a 20 righe tra gli eventi ricevuti e il backend può fornire `nextCursor`; non implementare paginazione nuova senza verificarne il contratto. Non far partire tutte le pagine di cronologia all'apertura.
- Ambiti All servers/guild e aggregazioni conservano le regole di `sound-stats.ts`: non sommare distribuzioni non sommabili e non esporre utenti di guild non consentite.
- Mancanza di permessi o storia privata non disponibile: stato distinto da rete lenta e da zero eventi.

## Period selector, riepiloghi e overview Sounds

- `?period=7d|30d|90d|all`, default `30d`, validazione già esistente.
- I loader library attuali dipendono anch'essi da period e includono summary: non promettere “solo analytics richieste” finché il contratto library continua a dipendere da period.
- Al cambio periodo mantenere l'elenco di suoni già noto e la selezione, avviare le sole richieste realmente dipendenti dal periodo; applicare i nuovi summary e grafici in modo coerente con la loro chiave.
- Se il nuovo risultato library cambia appartenenza o visibilità di un suono, applicare il risultato confermato e rimuovere azioni non più consentite; non congelare indefinitamente lo snapshot precedente.
- Skeleton nei valori riepilogo/grafici in attesa. Titoli, periodo selezionato e struttura restano disponibili senza analytics.
- Ordine default stabile: nessun salto delle righe al cambio periodo. Ordine per periodo esplicitamente selezionato: aggiornamento locale dell'ordinamento quando i dati corretti arrivano.
- Overview (LineChart, Top sounds, Most liked) differibile; un grafico lento o fallito non blocca il dettaglio base. Un solo risultato analytics condiviso può alimentare più grafici, con confini di presentazione separati.
- Non scaricare di nuovo le stesse analytics perché dettaglio e overview le leggono entrambi.
- Componenti grafici e RankList: preferire markup/SVG/CSS esistenti, nessuna libreria chart aggiuntiva. Skeleton con dimensioni riservate; stato vuoto solo dopo dato confermato.
- Link RankList seleziona il suono nella stessa libreria e conserva query compatibili. Non ricarica il documento né avvia una nuova copia della libreria.

## Player audio condiviso della libreria

- Un solo elemento audio per libreria, come responsabilità del layout persistente; niente elemento audio completo per ogni riga.
- Selezionare un altro dettaglio, cambiare tab, ricerca, owner/guild filtro interno alla libreria o periodo non ferma il brano in corso e non lo riavvia.
- Il brano in riproduzione può essere diverso da quello selezionato: rappresentare correttamente entrambi gli stati; il pulsante del suono B non deve apparire in pausa perché sta suonando A.
- Premere Play su un altro brano interrompe quello precedente e avvia il nuovo. Premere pausa agisce soltanto sul brano effettivamente in riproduzione.
- Uscita dalla libreria verso Settings, Servers, editor, home o un'altra libreria/guild: fermare audio e rilasciare risorse/listener. Il ritorno non avvia automaticamente audio.
- Buffering: indicatore solo sul player/riga attiva; gestire errore e fine riproduzione. Nessun autoplay al mount o caricamento preventivo di tutti i file.
- Selezioni Play rapide: una promise di play vecchia non deve cancellare o alterare lo stato dell'ultimo brano richiesto.

## VoteButtons

- Disponibili con il dettaglio base del suono, senza attendere grafici: stato iniziale da `Sound`, poi risposta canonica dell'azione.
- Click: feedback e blocco dei soli controlli di voto coinvolti durante invio; non bloccare elenco o navigazione e non invalidare tutta la dashboard.
- Aggiornare contatori e stato solo dal successo backend; conservare il comportamento attuale senza introdurre ottimismo non richiesto.
- Errore vicino ai pulsanti, ripristino della loro utilizzabilità. Nessun retry automatico della mutazione.
- Cambiando suono mentre il voto è in volo, applicare la risposta al suo soundId e mai al dettaglio attualmente aperto di un altro suono.
- Coerenza tra dettaglio, righe e riepiloghi che mostrano lo stesso dato: aggiornamento mirato dei valori confermati o invalidazione selettiva, senza mantenere una vecchia cache che annulla il voto al ritorno.

## GreetPicker

- Usato nel dettaglio e nell'editor. Account/greets già condivisi; aprire il menu non deve ricaricare `/me` o tutta la libreria.
- Se il dato account principale è disponibile, stato Global e guild subito. Eventuale rivalidazione non chiude il menu e non cancella interazioni.
- Cambio switch: inviare soltanto la voce modificata, stato di salvataggio nel picker. Conservare la logica di ripristino su fallimento, senza applicare rollback a uno switch più recente o a un altro suono.
- Successo: aggiornare greets condivisi in tutte le istanze. Se si usa l'invalidazione account esistente, non rimontare l'header né ricaricare analytics; evitare un doppio refresh dopo aver già applicato la stessa risposta.
- Un'operazione aggiorna global/guild corretta e mantiene la precedenza greet server > globale. Non usare una configurazione in cache come prova che il backend ha salvato.
- Gli errori sono locali al picker e alla voce che li ha generati; non contaminano un altro dettaglio aperto successivamente.

## SoundEditor, ricerca tag e cancellazione

- URL: `/dashboard/me/sounds/{soundId}/edit/`.
- Accesso diretto: caricare singolo `sound(soundId)` e verificare canEdit/canDelete; HTML principale con form e identità. Non caricare library o batch analytics.
- Arrivo dalla libreria: mantenere AppHeader, fermare il player della libreria. Si possono mostrare subito dati base già noti, ma permessi/record del loader restano autoritativi; niente form salvabile prima che l'accesso sia confermato.
- Record non pronto: titolo generico “Edit sound” e skeleton del form. Non mostrare il nome del suono precedente.
- Nome, visibilità, tag e preview sono locali finché si salva. Applicare avviso dirty a breadcrumb, Full analytics, altri link, back/forward e refresh.
- Suggerimenti tag: richiesta soltanto con input non vuoto, debounce già presente di 200 ms, cleanup e controllo query delle risposte. Pending/error vicino al campo, senza bloccare il form.
- Nessun risultato non equivale a richiesta fallita. Un suggerimento tardivo non riapre il menu dopo cancellazione query o uscita dall'editor.
- Save: stato locale, mantenere valori su errore; risposta aggiorna record e snapshot, azzera dirty solo per i valori effettivamente salvati. Non caricare analytics complete per aggiornare il form.
- Ritorno alla libreria dopo modifica: invalidare dati principali coinvolti (nome, visibilità, tag) e cache del dettaglio, senza riutilizzare una copia precedente. Le statistiche non correlate possono essere riusate.
- I link dell'editor oggi ricaricano il documento per evitare dati stale. Sostituirli con navigazione interna solo quando l'invalidazione attraversa correttamente il confine editor/libreria; non rimuovere il reload isolatamente.
- Delete: dialog nativo di conferma prima del POST/DELETE, pending e messaggio dentro il dialog, nessuna cancellazione ottimistica.
- Successo Delete: rimuovere cache e selezioni del suono, aggiornare eventuali greets che lo usavano e tornare alla libreria base; mai tornare alla URL del dettaglio eliminato.
- Errore Delete: dialog e record rimangono, pulsante riabilitato. In caso di esito di rete incerto non ripetere automaticamente l'operazione.
- Player dell'editor locale, preload none, nessuna continuità con la libreria; uscita editor ferma l'audio.

## Skeleton, feedback, accessibilità e scroll

- Usare skeleton strutturali per il primo contenuto mancante: card server, righe Sounds, dettaglio base, form e grafici, ciascuno con geometria vicina al risultato.
- Usare mini loader per operazioni locali: analytics, aggiornamento periodo, ordinamento richiesto, tag, Save, Delete, voto e audio. Evitare spinner a schermo intero.
- Nessuno skeleton di header/sidebar già disponibili. Nessuno skeleton per una ricerca locale, un filtro su dati in memoria o “Load more” locale.
- Riservare spazio a immagini, statistiche e grafici per contenere salti di layout. Il primo dato pronto può sostituire il suo skeleton senza attendere gli altri.
- Non annunciare ai lettori di schermo ogni singola cella skeleton; decorazioni aria-hidden, stato sintetico e `aria-busy` sulla regione interessata. Errori con messaggi associati ai controlli.
- `prefers-reduced-motion`: skeleton statici o movimento ridotto, nessuna View Transition obbligatoria.
- Cambio pagina principale: gestione focus verso il titolo/inizio del centro dopo navigazione riuscita. Cambio dettaglio/filtro/tab: non rubare focus al controllo attivato e non riportare in cima tutta la pagina.
- Conservare scroll lista durante selezione suono e scroll sidebar durante cambio sezione. Su mobile rendere raggiungibile il dettaglio selezionato senza perdere il ritorno alla lista.
- Navigazione annullata da avviso dirty: nessun cambio di focus, scroll o audio.

## Cache, prefetch, invalidazione e chiamate ripetute

- Mantenere distinte cache di account, guild, library, analytics e record editor. Identità sessione/guild/suono/periodo/ambito coerenti con il dato; non usare una cache globale condivisa per dati privati.
- Header privati e `Vary: Cookie` preservati; HTML privato, azioni, errori e redirect non devono diventare cache pubblica. Ripulire o separare il riuso dati quando cambia sessione.
- Cinque minuti è la policy attuale di alcuni loader, non un motivo per considerare immutabili permessi, cancellazioni e impostazioni appena salvate.
- Il README documenta guardie Qwik che rieseguono account prima di loader figli: verificare nella versione installata prima di introdurre più loader e moltiplicare `/me`. Deduplicare per richiesta dove serve e non creare una nuova catena auth per ogni blocco.
- Non eliminare guardie necessarie per evitare chiamate duplicate. Se si alleggerisce un controllo, mantenere autorizzazione equivalente sul percorso che restituisce dati e azioni.
- Prefetch codice per le destinazioni probabili; prefetch dati su intento/focus per contenuti utili. Distinguere bundle e dati tramite API Qwik installate.
- Non anticipare il caricamento di tutte le guild, tutti i periodi, tutti gli editor e tutti gli audio. Link a dettagli già coperti dalla library/batch non devono generare richieste API duplicate.
- Prefetch deve essere di sola lettura: nessun login transaction, logout, voto, salvataggio o cancellazione. Valutare il costo reale dei GET che contattano Discord e rispettare data saver.
- Cambio di soli `owner`, `guild` filtro personale, `tab`, ricerca locale e selezione già coperta dai dati: nessuna nuova chiamata Beebot necessaria per quel cambiamento. Eventuali rivalidazioni dovute a scadenza sono una policy distinta e non vanno nascoste nelle promesse prestazionali.
- Cambio `period`: richieste solo dei dati che dipendono davvero da esso; `useAccount` e impostazioni guild non dipendono da period.
- Save Settings invalida guild; save greet aggiorna account/greets; edit/delete sound aggiorna record e librerie interessate; voto aggiorna lo stato del suono. Evitare “invalidate all”.
- Il client Beebot e i parser restano il confine unico di trasporto e validazione. Non fare fetch grezze nei componenti per aggirare loader, sessione o forma del contratto.

## Qwik 2, SSR, Pending, errori e metadati

- Verificare API e compatibilità della versione effettivamente installata, non copiare esempi di Qwik 1 o assumere che la documentazione più recente corrisponda esattamente alla RC.
- `Pending` e `blockSSR: false` sono sperimentali nella versione esaminata. Abilitare soltanto le opzioni necessarie e validarle localmente con adapter e modalità produzione.
- Contenuto principale SSR bloccante in accesso documento; analytics background. In navigazione interna usare i confini Pending per dare una destinazione riconoscibile mentre mancano dati principali o secondari.
- Non rendere un loader principale non bloccante su accesso diretto per abitudine. Se si implementa una distinzione documento/richiesta interna, usare le API pubbliche effettivamente disponibili, non euristiche sul referrer.
- Il confine deve contenere la lettura del dato lento, compreso il componente che lo legge. Spostare solo il JSX del grafico sotto Pending non basta se il padre ha già letto `.value`.
- Non mantenere un `head` che risolve il loader analytics per ottenere il nome del suono. Metadati e favicon dai dati principali; evitare che i secondari blocchino indirettamente lo streaming.
- Background loader non può trasformare retroattivamente l'HTTP iniziale in 302/403/404. Tenere guardie bloccanti e gestire fallimenti differiti nell'area corretta.
- Il README documenta un limite attuale: errore loader durante SPA può lasciare la vecchia pagina senza messaggio. È una dipendenza da risolvere prima di generalizzare `Link` e rimuovere i reload intenzionali di cambio guild/editor.
- Verificare `Catch`/error boundary della RC installata o un risultato serializzabile discriminato per errori locali, integrato nel client già esistente; non duplicare la gestione trasporto. Un throw non intercettato e un loader infinito non sono una soluzione.
- Se un errore di route non è gestibile correttamente con le API disponibili, usare come recupero esplicito una navigazione documento alla destinazione per ottenere errore SSR; nessun loop e nessun reload per ogni successo normale.
- 403/404 di destinazione sostituiscono il centro con errore appropriato, conservando dove possibile il layout sicuro. 5xx/rete offrono retry. Un errore analytics resta confinato alle analytics.
- Retry GET locale: rifare soltanto il dato fallito, non account + guild + elenco + tutti i grafici. Rispettare Retry-After e non creare polling o retry illimitati.
- Non introdurre hydration, React o CSR globale. Non spostare l'intero caricamento in `useVisibleTask$`.

## Matrice delle transizioni da coprire

Ogni riga comprende entrambe le direzioni se applicabili. Le regole generali coprono cache calda/fredda, click/tastiera, back/forward, rete lenta, errore, annullamento e selezioni rapide: non servono comportamenti differenti per ogni coppia di ID.

| Origine → destinazione/azione | Persistente | Cambia / caricamento |
| --- | --- | --- |
| Documento → qualsiasi URL protetta | Nessuna UI precedente richiesta | Guardia + SSR principale; secondari dopo |
| Home → Dashboard | Nessuna struttura dashboard ancora montata | Login se serve; lista server SSR o navigazione appropriata |
| Servers → Settings guild | Header account | Barra guild, sidebar e centro; skeleton mirati se mancanti |
| Servers → My sounds | Header account | Libreria personale; analytics indipendenti |
| Settings overview → sezione | Header, barra guild, sidebar | Centro; dati guild riusati |
| Sezione Settings A → B | Header, barra guild, sidebar | Avviso dirty; solo form centrale |
| Rewards level A → B | Struttura Settings ed elenco livelli | Avviso dirty; solo form reward |
| Twitch streamer A → B | Struttura Settings ed elenco streamer | Avviso dirty; solo form streamer |
| Settings → Sounds stessa guild | Header e barra guild | Avviso dirty; sidebar Settings smontata; libreria |
| Sounds → Settings stessa guild | Header e barra guild | Audio fermato; sidebar ricreata e centro Settings |
| Guild A → B, stessa sezione | Header account | Avviso dirty; nuovi contesto/dati; niente contenuti A sotto B |
| Guild → Servers | Header account | Centro lista; smonta contesto guild e ferma audio |
| Sounds guild → My sounds | Header account | Nuovo ambito, player vecchio fermato |
| My sounds → Sounds guild | Header account | Contesto guild autorizzato, nuova libreria |
| Sound A → B stessa libreria | Layout, lista, ricerca, scroll e audio | Base B subito se presente; analytics B solo se mancanti |
| Period A → B | Layout, lista, selezione e audio | Dati dipendenti da periodo, loader locali |
| Owner filter / guild filter personale | Layout, libreria e audio | Filtraggio locale e selezione coerente |
| Everyone → Your plays | Lista, identità e audio | Pannello/tab e URL; batch riusato |
| Search / Load more | Tutta la libreria | Solo righe locali; nessuna rete fittizia |
| Ordine stabile → plays periodo | Layout e dati base | Ordine locale se analytics pronte, altrimenti loader ordinamento |
| Dettaglio → Edit | Header account | Audio libreria fermato; singolo record e permessi |
| Edit → dettaglio/libreria | Header account | Avviso dirty; cache aggiornata; niente record vecchio |
| Save Settings / Edit / Greet / Vote | Layout e contenuti non coinvolti | Pending locale e aggiornamento/invalidation selettiva |
| Delete confermato → libreria | Header account | Rimozione record/cache/greets correlati; selezione base |
| Qualsiasi pagina → Home/logout | Nessun contesto privato persistente | Stop audio, pulizia stato prevista, navigazione/redirect |
| Navigazione rifiutata dall'avviso dirty | Tutta la pagina attuale | Nessun cambio URL, scroll, audio o dati |
| Back/forward → stato precedente | Layout condivisi compatibili | URL/filtri/selezione/scroll ripristinati; dati secondo cache |
| ID guild/sound inesistente o vietato | Header sicuro se disponibile | Errore destinazione, mai fallback a record diverso |

## Criteri di completamento per Claude

- Coprire tutte le route e le transizioni sopra; non limitarsi alla demo Sounds o alla sola barra di caricamento.
- Validare localmente primo accesso, navigazione, refresh, back/forward e nuova scheda. Ispezionare l'HTML SSR con fixture: principale presente prima del JavaScript client, analytics non bloccanti.
- Usare ritardi distinti per account/guild/library/analytics e invertirne l'ordine: nessuna dipendenza artificiale fra risposte indipendenti. Errori separati per ciascuna regione.
- Verificare cache fredda/calda/scaduta, invalidazione dopo azioni, logout e cambio sessione, 401/403/404/429/5xx, rete fallita e risposta tardiva.
- Verificare che cambiare suono/tab/filtro non scateni copie delle richieste batch già risolte; contare anche le richieste server-to-server alle fixture, non solo i fetch del browser.
- Verificare che la UI non abbia bisogno delle analytics per rendere titolo, elenco, base suono, player o form. La schermata principale deve restare utilizzabile se l'analytics fallisce.
- Verificare avvisi dirty, reset, errori parziali, invii doppi, risposte dopo cambio selezione e audio che continua/si ferma secondo le decisioni.
- Validare tastiera, focus, reduced motion, mobile e scroll persistente. Non dedurre il funzionamento SPA da una sola build riuscita.
- Eseguire TypeScript, build e verifiche locali pertinenti senza credenziali live. Distinguere test simulati da prestazioni reali e riportare i limiti non verificati.
- Aggiornare README e linee guida soltanto nei punti effettivamente cambiati; rimuovere le descrizioni dei limiti solo dopo averne verificato la soluzione. Mantenere `CLAUDE.md` come richiamo alle regole condivise, senza duplicare tutto questo documento.
- Consegnare elenco delle modifiche, verifiche locali, comportamento finale per accesso diretto/navigazione e limiti residui. Nessun deploy o push implicito.

## Riferimenti tecnici

- Fonte del comportamento corrente: `README.md`, route e componenti della repository ispezionati il 12 novembre 2026; il codice resta la fonte da ricontrollare all'implementazione.
- [Qwik 2 RC — Pending, streaming e loader](https://next.qwik.dev/blog/qwik-2-rc/).
- [Qwik Router — loader e blockSSR](https://next.qwik.dev/docs/route-loader/).
- [Qwik Router — routing e navigazione](https://next.qwik.dev/docs/routing/).
- [Qwik Router API — prefetch e loader](https://next.qwik.dev/api/qwik-router/).

Nessuna domanda di prodotto tra quelle poste per preparare questo documento è rimasta senza risposta. L'ordinamento alfabetico di default e il nome del suo parametro sono scelte implementative proposte per concretizzare l'ordine stabile richiesto; non sono comportamenti già presenti.
