# Dokumnetacja API

## Sprawy

### URL
https://portal.wroclaw.sa.gov.pl/lublin/api/dashboard/lawsuits

### response
[
    {
        "id": 7062767,
        "court": "Sąd Rejonowy w Puławach",
        "subject": "akt oskarżenia - Ks",
        "signature": "II K 716/25"
    },
    {
        "id": 6532991,
        "court": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "signature": "II K 829/24"
    }
]

## Strony

### URL
https://portal.wroclaw.sa.gov.pl/lublin/api/v2/parties/lawsuit?page=0&size=20&sort=&lawsuitId.equals=6532991

### reposne
[
    {
        "id": 23431139,
        "role": "oskarżony",
        "name": "Janusz Stanuch",
        "address": null,
        "type": "R",
        "priority": 42,
        "parentId": null,
        "status": null,
        "dateFrom": "2026-02-16T10:30:00.163814300Z",
        "dateTo": null,
        "gainedAccessDate": "2026-02-16T10:30:00.499Z",
        "representatives": [],
        "createdDate": "2024-05-13T16:33:19.550Z",
        "modificationDate": "2026-02-16T10:30:00.498Z",
        "hasAccess": true
    },
    {
        "id": 23431544,
        "role": "prokuratura",
        "name": "Pierwszy Urząd Skarbowy w Lublinie",
        "address": null,
        "type": null,
        "priority": 9999,
        "parentId": null,
        "status": "",
        "dateFrom": "2024-05-13T16:37:04.185Z",
        "dateTo": null,
        "gainedAccessDate": "2024-05-13T16:37:04.185Z",
        "representatives": [],
        "createdDate": "2024-05-13T16:37:04.185Z",
        "modificationDate": "2025-03-28T17:25:27.666Z",
        "hasAccess": true
    }
]

## posiedzenia

### URL
https://portal.wroclaw.sa.gov.pl/lublin/api/court-sessions/lawsuit?page=0&size=20&sort=dateFrom,desc&lawsuitId.equals=6532991

### response
[
    {
        "id": 10898350,
        "signature": "II K 829/24",
        "court": null,
        "date": "2025-04-23T22:00:00Z",
        "room": null,
        "procedure": "posiedzenie",
        "judge": "SSR Anna Stachurska",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "value": null,
        "eprotocol": null,
        "eprotocolId": null,
        "eprotocolVideoPath": null,
        "result": "postanowienie - sprostowanie omyłki pisarskiej",
        "videoArchivizationDate": null,
        "transcriptionFilesPresent": null,
        "createdDate": "2025-04-25T16:41:16.059Z",
        "modificationDate": "2025-04-25T16:41:16.059Z"
    },
    {
        "id": 10721474,
        "signature": "II K 829/24",
        "court": null,
        "date": "2025-03-13T07:50:00Z",
        "room": "VI",
        "procedure": "posiedzenie",
        "judge": "SSR Anna Stachurska",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "value": null,
        "eprotocol": null,
        "eprotocolId": null,
        "eprotocolVideoPath": null,
        "result": "wyrok",
        "videoArchivizationDate": null,
        "transcriptionFilesPresent": null,
        "createdDate": "2025-01-22T17:45:22.471Z",
        "modificationDate": "2025-05-16T16:34:15.711Z"
    },
    {
        "id": 10614038,
        "signature": "II K 829/24",
        "court": null,
        "date": "2025-01-20T13:15:00Z",
        "room": "VI",
        "procedure": "posiedzenie",
        "judge": "SSR Anna Stachurska",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "value": null,
        "eprotocol": null,
        "eprotocolId": null,
        "eprotocolVideoPath": null,
        "result": "odroczono posiedzenie",
        "videoArchivizationDate": null,
        "transcriptionFilesPresent": null,
        "createdDate": "2024-11-21T17:39:57.196Z",
        "modificationDate": "2025-04-24T16:35:43.862Z"
    },
    {
        "id": 10525564,
        "signature": "II K 829/24",
        "court": null,
        "date": "2024-11-27T13:15:00Z",
        "room": "VI",
        "procedure": "posiedzenie",
        "judge": "SSR Anna Stachurska",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "value": null,
        "eprotocol": null,
        "eprotocolId": null,
        "eprotocolVideoPath": null,
        "result": "odwołano posiedzenie",
        "videoArchivizationDate": null,
        "transcriptionFilesPresent": null,
        "createdDate": "2024-10-04T16:45:07.712Z",
        "modificationDate": "2024-11-19T17:42:07.893Z"
    },
    {
        "id": 10363403,
        "signature": "II K 829/24",
        "court": null,
        "date": "2024-08-28T12:15:00Z",
        "room": "VI",
        "procedure": "posiedzenie",
        "judge": "SSR Anna Stachurska",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "value": null,
        "eprotocol": null,
        "eprotocolId": null,
        "eprotocolVideoPath": null,
        "result": "odwołano posiedzenie",
        "videoArchivizationDate": null,
        "transcriptionFilesPresent": null,
        "createdDate": "2024-06-29T07:07:14.552Z",
        "modificationDate": "2024-08-20T16:38:21.121Z"
    }
]

## czynności

### URL
https://portal.wroclaw.sa.gov.pl/lublin/api/proceeding-views?page=0&size=10&sort=date,desc&caseId.equals=6532991

### response

[
    {
        "id": 62314167,
        "caseId": 6532991,
        "documentId": null,
        "date": "2025-05-19T07:59:49.013Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Biuro podawcze: pismo",
        "sender": "Pierwszy Urząd Skarbowy - Lublin",
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 62277275,
        "caseId": 6532991,
        "documentId": null,
        "date": "2025-05-15T08:28:12.437Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Biuro podawcze: pismo",
        "sender": "Sąd Rejonowy dla Krakowa-Krowodrzy, II Wydział Karny",
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 62051888,
        "caseId": 6532991,
        "documentId": null,
        "date": "2025-04-24T22:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: doręcz. odp post. - ogólne nie kończące po 5.10.2019",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 62051887,
        "caseId": 6532991,
        "documentId": null,
        "date": "2025-04-24T22:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: doręcz. odp post. - ogólne nie kończące po 5.10.2019",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 60965711,
        "caseId": 6532991,
        "documentId": null,
        "date": "2025-02-02T23:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: zawiadomienie oskarżonego o warunkowym umorzeniu",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 60965712,
        "caseId": 6532991,
        "documentId": null,
        "date": "2025-02-02T23:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: KRK",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 60400495,
        "caseId": 6532991,
        "documentId": null,
        "date": "2024-12-15T23:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: pismo wolne",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 60381160,
        "caseId": 6532991,
        "documentId": null,
        "date": "2024-12-13T09:03:12.217Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Biuro podawcze: pismo",
        "sender": "Pierwszy Urząd Skarbowy",
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 60086599,
        "caseId": 6532991,
        "documentId": null,
        "date": "2024-11-20T23:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: zawiadomienie oskarżonego o  posiedzeniu dpk 15.04.16",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    },
    {
        "id": 60086598,
        "caseId": 6532991,
        "documentId": null,
        "date": "2024-11-20T23:00:00Z",
        "signature": "II K 829/24",
        "courtName": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
        "name": "Wysłano pismo: KRK",
        "sender": null,
        "comment": null,
        "judge": "SSR Anna Stachurska",
        "party": "Janusz Stanuch, Pierwszy Urząd Skarbowy w Lublinie",
        "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
        "fullDocumentName": null,
        "receiver": null,
        "documentName": null
    }
]

## dokumenty

### URL
https://portal.wroclaw.sa.gov.pl/lublin/api/v3/documents?page=0&size=10&sort=publicationDate,desc&lawsuitId.equals=6532991

https://portal.wroclaw.sa.gov.pl/lublin/api/v3/documents/29084724
### response

[
    {
        "id": 26500058,
        "createDate": "2025-04-23T22:00:00Z",
        "publicationDate": "2025-04-25T16:35:41.836Z",
        "documentName": "Postanowienie (utworzono 24.04.2025)",
        "fileName": "153005250001006_II_K_829_24_20250424_id26814047_postanowienie_utworzono_24_04_2025_.doc",
        "documentType": 7,
        "downloaded": true,
        "documentChecksum": "78c6cbb4ae00b290cd948bdfbab37205",
        "createdDate": "2025-04-25T16:35:41.836Z",
        "modificationDate": "2025-04-25T16:35:41.836Z",
        "writingId": null,
        "writingAttachmentType": "DOCUMENT",
        "docsCount": null
    },
    {
        "id": 26140842,
        "createDate": "2025-03-13T07:50:00Z",
        "publicationDate": "2025-03-13T19:36:34.376Z",
        "documentName": "Protokół posiedzenia (utworzono 13.03.2025)",
        "fileName": "153005250001006_II_K_829_24_20250313_id26452432_protokol_posiedzenia_utworzono_13_03_2025_.doc",
        "documentType": 1,
        "downloaded": true,
        "documentChecksum": "7fd7007c1e28e5d2e5f618219731ddd0",
        "createdDate": "2025-03-13T19:36:34.377Z",
        "modificationDate": "2025-03-13T19:36:34.377Z",
        "writingId": null,
        "writingAttachmentType": "DOCUMENT",
        "docsCount": null
    },
    {
        "id": 26140719,
        "createDate": "2025-03-13T07:50:00Z",
        "publicationDate": "2025-03-13T19:36:18.892Z",
        "documentName": "Wyrok (utworzono 13.03.2025)",
        "fileName": "153005250001006_II_K_829_24_20250313_id26452309_wyrok_utworzono_13_03_2025_.doc",
        "documentType": 6,
        "downloaded": true,
        "documentChecksum": "34b2be33edec70a16a90a482efd992c5",
        "createdDate": "2025-03-13T19:36:18.893Z",
        "modificationDate": "2025-03-13T19:36:18.893Z",
        "writingId": null,
        "writingAttachmentType": "DOCUMENT",
        "docsCount": null
    },
    {
        "id": 25779695,
        "createDate": "2025-01-20T13:15:00Z",
        "publicationDate": "2025-01-30T17:34:53.739Z",
        "documentName": "Protokół posiedzenia (utworzono 20.01.2025)",
        "fileName": "153005250001006_II_K_829_24_20250120_id26088578_protokol_posiedzenia_utworzono_20_01_2025_.doc",
        "documentType": 1,
        "downloaded": true,
        "documentChecksum": "0c56f15db22e9802c5ba1927878ba412",
        "createdDate": "2025-01-30T17:34:53.740Z",
        "modificationDate": "2025-01-30T17:34:53.740Z",
        "writingId": null,
        "writingAttachmentType": "DOCUMENT",
        "docsCount": null
    }
]

## powiązania

### URL
https://portal.wroclaw.sa.gov.pl/lublin/api/relations?page=0&size=20&sort=id,asc&lawsuitId.equals=6532991

### response
[
    {
        "id": 2692115,
        "signature": "RSP 9/2024/0610/SKK-2/KM",
        "relationType": "SSP",
        "authority": "Pierwszy Urząd Skarbowy w Lublinie",
        "judge": null,
        "receiptDate": null,
        "decissionDate": null,
        "result": null,
        "externalId": "S/658/powiazanie/74449",
        "lawsuit": {
            "id": 6532991,
            "signature": "II K 829/24",
            "number": 829,
            "year": 2024,
            "subject": "warunkowe umorzenie postępowania w trybie art. 336 kpk",
            "value": null,
            "result": null,
            "receiptDate": "2024-05-09T22:00:00Z",
            "finishDate": "2025-03-12T23:00:00Z",
            "instanceSignature": null,
            "instanceCourt": null,
            "instanceJudge": null,
            "instanceReceiptDate": null,
            "instanceJudgementDate": null,
            "lastUpdate": "2025-05-19T16:42:18.781Z",
            "externalId": "S/658/sprawa/74697",
            "volumesNumber": null,
            "visible": true,
            "judge": {
                "id": 15567,
                "firstName": "Anna",
                "lastName": "Stachurska",
                "title": "SSR",
                "externalId": "S/658/sedzia/44",
                "createdDate": "2023-05-18T12:06:11.908Z",
                "modificationDate": "2026-03-27T17:24:52.628Z"
            },
            "repertory": {
                "id": 514,
                "departmentNumber": "2",
                "name": "K",
                "externalId": "S/658/repertorium/1",
                "published": true,
                "courtDepartment": {
                    "id": 49,
                    "departmentNumber": "II",
                    "name": "II Wydział Karny",
                    "email": "w2@lublin-wschod.sr.gov.pl",
                    "eternalId": null,
                    "identifier": "153005250001006",
                    "applicatingBlocked": false,
                    "published": true,
                    "court": {
                        "id": 12,
                        "name": "Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku",
                        "address1": "21-040 Świdnik, Kardynała Stefana Wyszyńskiego 18",
                        "address2": "Świdnik",
                        "identifier": "15300525",
                        "disabled": false,
                        "receiveWritings": true
                    },
                    "departmentNumberNumeral": 2
                }
            },
            "createdDate": "2024-05-13T16:31:43.303Z",
            "modificationDate": "2025-05-19T16:42:31.346Z"
        },
        "relatedId": null
    }
]

## Pobieranie plików z PISP
### format oryginalny

https://portal.wroclaw.sa.gov.pl/doc/documents/web/[file_id]/download

### PDF
https://portal.wroclaw.sa.gov.pl/doc/documents/web/[file_id]/download/pdf





https://portal.wroclaw.sa.gov.pl/doc/documents/web/29084724/download/pdf
https://portal.wroclaw.sa.gov.pl/doc/documents/web/29084724/download/pdf
