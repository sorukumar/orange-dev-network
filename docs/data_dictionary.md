# Bitcoin Social Data Dictionary

This document describes the structure and fields of the Parquet files used in the Bitcoin social data project.

## social_mailing_list.parquet
Contains emails from the Bitcoin-dev mailing list.

### Fields
- `source` (string): Always "mailing_list".
- `message_id` (string): Unique email message ID.
- `date` (datetime): Email timestamp.
- `author_name` (string): Author's display name.
- `author_email` (string): Author's email address.
- `canonical_id` (string): Mapped canonical author identifier.
- `subject` (string): Email subject line.
- `body_snippet` (string): First 200 characters of email body.
- `thread_id` (string): Thread identifier (in_reply_to or message_id).
- `reply_to` (string): ID of the message being replied to.
- `is_reply` (boolean): True if this is a reply.

### Sample Records
```json
[
  {
    "source": "mailing_list",
    "message_id": "<202105112150.51410.luke@dashjr.org>",
    "date": "2021-05-11 16:50:50",
    "author_name": "Luke Dashjr",
    "author_email": "luke@dashjr.org",
    "subject": "Re: [bitcoin-dev] Full Disclosure: CVE-2021-31876 Defect in Bitcoin Core's bip125 logic",
    "body_snippet": "Is there a list of software impacted by this CVE, and the versions it is fixed in? (Note this isn't a vulnerability in Bitcoin Core; BIP125 is strictly a policy matter, not part of the consensus ru",
    "thread_id": "<CALZpt+GK4WNBmKim3w9LAd1b69+uAyAsNu5tVniHzN6Ue4KJCw@mail.gmail.com>",
    "reply_to": "<CALZpt+GK4WNBmKim3w9LAd1b69+uAyAsNu5tVniHzN6Ue4KJCw@mail.gmail.com>",
    "canonical_id": "Luke Dashjr"
  },
  {
    "source": "mailing_list",
    "message_id": "<201207092307.19365.luke@dashjr.org>",
    "date": "2012-07-09 18:07:17",
    "author_name": "Luke-Jr",
    "author_email": "luke@dashjr.org",
    "subject": "[Bitcoin-development] Wiki client list (was: Random order for clients page)",
    "body_snippet": "https://en.bitcoin.it/wiki/Clients",
    "thread_id": "<4FFB5A7E.7020604@justmoon.de>",
    "reply_to": "<4FFB5A7E.7020604@justmoon.de>",
    "canonical_id": "Luke Dashjr"
  },
  {
    "source": "mailing_list",
    "message_id": "<CAPg+sBhH0MODjjp8Avx+Fy_UGqzMjUq_jn3vT3oH=u3711tsSA@mail.gmail.com>",
    "date": "2016-01-07 17:52:27",
    "author_name": "Pieter Wuille",
    "author_email": "pieter.wuille@gmail.com",
    "subject": "Re: [bitcoin-dev] Time to worry about 80-bit collision attacks or not?",
    "body_snippet": "> \"The problem case is where someone in a contract setup shows you a script, which you accept as being a payment to yourself. An attacker could use a collision attack to construct scripts with identic",
    "thread_id": "<CABsx9T3aTme2EQATamGGzeqNqJkUcPGa=0LVidJSRYNznM-myQ@mail.gmail.com>",
    "reply_to": "<CABsx9T3aTme2EQATamGGzeqNqJkUcPGa=0LVidJSRYNznM-myQ@mail.gmail.com>",
    "canonical_id": "Pieter Wuille"
  }
]
```

## social_delving.parquet
Contains posts from the Delving Bitcoin forum.

### Fields
- `source` (string): Always "delving".
- `message_id` (string): Unique post ID (e.g., "post_123").
- `date` (datetime): Post timestamp.
- `author_name` (string): Author's display name (often null).
- `author_email` (string): Always null.
- `canonical_id` (string): Mapped canonical author identifier (often null).
- `subject` (string): Post title or "Re: [title]" for replies.
- `body_snippet` (string): First 200 characters of post body.
- `thread_id` (string): Thread identifier (e.g., "topic_123").
- `reply_to` (string): ID of the post being replied to (null for originals).
- `is_reply` (boolean): True if this is a reply.
- `link` (string): URL to the post.

### Sample Records
```json
[
  {
    "source": "delving",
    "message_id": "post_10",
    "date": "2022-08-24 07:05:45.128000",
    "author_name": null,
    "author_email": null,
    "canonical_id": null,
    "subject": "Welcome to Delving Bitcoin!",
    "body_snippet": "This site is for technical discussions with the goal of understanding Bitcoin and helping it last for the long term.\nWhen starting a post here, try to make it at the level of giving a presentation to",
    "thread_id": "topic_7",
    "reply_to": null,
    "is_reply": false,
    "link": "https://delvingbitcoin.org/t/welcome-to-delving-bitcoin/7/1"
  },
  {
    "source": "delving",
    "message_id": "post_43",
    "date": "2022-08-24 13:05:37.684000",
    "author_name": null,
    "author_email": null,
    "canonical_id": null,
    "subject": "Re: Welcome to Delving Bitcoin!",
    "body_snippet": "",
    "thread_id": "topic_7",
    "reply_to": null,
    "is_reply": false,
    "link": "https://delvingbitcoin.org/t/welcome-to-delving-bitcoin/7/2"
  },
  {
    "source": "delving",
    "message_id": "post_6461",
    "date": "2025-12-18 22:38:10.735000",
    "author_name": null,
    "author_email": null,
    "canonical_id": null,
    "subject": "A quantum resistance script only using op_ctv/op_txhash and no new signatures",
    "body_snippet": "Anchor-gated, UTXO-moving, template-bound spend\nusing OP_TXHASH + OP_CTV with an escape hatch\n(prunable-friendly; quantum-resilient to signature forgery)\n\nAssumptions\n\n\nOP_CHECKTEMPLATEVERIFY (OP_CTV)",
    "thread_id": "topic_2168",
    "reply_to": null,
    "is_reply": false,
    "link": "https://delvingbitcoin.org/t/a-quantum-resistance-script-only-using-op-ctv-op-txhash-and-no-new-signatures/2168/1"
  }
]
```

## social_combined.parquet
Merged dataset from mailing list and delving.

### Fields
Same as above, depending on source.

### Sample Records
```json
[
  {
    "source": "delving",
    "message_id": "post_6801",
    "date": "2026-02-11 07:26:23.973000",
    "author_name": null,
    "author_email": null,
    "canonical_id": null,
    "subject": "Re: A quantum resistance script only using op_ctv/op_txhash and no new signatures",
    "body_snippet": "As noted: a new SegWit version is also needed: \u201ckey spend allowed only if no script tree\u201d or \u201cscript tree only\u201d",
    "thread_id": "topic_2168",
    "reply_to": "post_5",
    "is_reply": true,
    "link": "https://delvingbitcoin.org/t/a-quantum-resistance-script-only-using-op-ctv-op-txhash-and-no-new-signatures/2168/6"
  },
  {
    "source": "delving",
    "message_id": "post_6800",
    "date": "2026-02-10 22:17:00.662000",
    "author_name": null,
    "author_email": null,
    "canonical_id": null,
    "subject": "Re: Hourglass V2 Update",
    "body_snippet": "Hourglass would ideally be activated as a flag day soft fork at a certain block height announced well in advance. Anyone having access to their keys and awareness of activation would be highly incent",
    "thread_id": "topic_2246",
    "reply_to": "post_2",
    "is_reply": true,
    "link": "https://delvingbitcoin.org/t/hourglass-v2-update/2246/4"
  },
  {
    "source": "delving",
    "message_id": "post_6799",
    "date": "2026-02-10 22:13:30.285000",
    "author_name": null,
    "author_email": null,
    "canonical_id": null,
    "subject": "Re: Hourglass V2 Update",
    "body_snippet": "(post deleted by author)",
    "thread_id": "topic_2246",
    "reply_to": "post_2",
    "is_reply": true,
    "link": "https://delvingbitcoin.org/t/hourglass-v2-update/2246/3"
  }
]
```

## social_combined_categorized.parquet
Enriched version of `social_combined.parquet` produced by
`scripts/analysis/categorize_threads.py`. Every message inherits the
categorization of its thread (all messages in a thread share the same
category and BIP refs).

### Additional Fields (on top of social_combined fields)
- `bip_refs` (list[string]): BIP numbers **explicitly mentioned** in the thread text (e.g., `["141", "143"]`). Empty list if none found. Extracted via regex matching patterns like `BIP 141`, `BIP-141`, `BIP#141`.
- `category` (string): Single best-fit category for the thread (see Category Reference below).
- `categories` (list[string]): All matching categories that scored ≥ 20% of the primary category's score. Enables multi-label analysis (e.g., a thread about "CTV for Lightning vaults" may have `["covenants", "lightning", "vaults"]`).
- `category_conf` (float): Confidence score 0–1 indicating how dominant the primary category is relative to all matched categories. Higher = more clearly about one topic.

### Design Note: `bip_refs` vs `category`

These two fields serve different purposes and are intentionally kept separate:

- **`bip_refs`** answers: *"Does this thread explicitly cite a BIP by number?"* — This is a precise, verifiable signal. Only ~14.6% of threads contain explicit BIP references because Bitcoin development is concept-driven: ideas are debated for months or years before a BIP number is assigned (e.g., "segregated witness" was discussed long before BIP 141 existed). Some major topics like Lightning, Ordinals, BitVM, and ecash never went through the BIP process at all.

- **`category`** answers: *"What is this thread about?"* — This captures the semantic topic via keyword and regex matching, covering ~72% of threads. A thread titled "Segregated Witness considered harmful" is categorized as `segwit` even though it never mentions "BIP 141".

Categories with high BIP-ref rates (e.g., `wallet-keys` at 75%, `payment-protocol` at 56%) reflect mature standards where devs habitually cite BIP numbers. Categories with low rates (e.g., `lightning` at 1%, `ordinals-inscriptions` at 1.5%, `bitvm` at 0%) reflect topics that live outside or predate the BIP process.

### Category Reference

38 categories designed to trace Bitcoin's technical history from 2011 to the present.

#### Consensus & Protocol Evolution
| Category | Description | Related BIPs |
|---|---|---|
| `soft-fork-activation` | Soft fork activation mechanisms: BIP 8/9, Speedy Trial, UASF, flag day, version bits | 8, 9, 91, 135, 148, 149, 343 |
| `hard-fork-block-size` | Block size debate & hard fork proposals (2015–2017 era): XT, Classic, Unlimited, SegWit2x | 100–107, 109 |
| `consensus-cleanup` | Great Consensus Cleanup & related fixes: timewarp, 64-byte txs, duplicate txs | 30, 53, 54 |
| `segwit` | Segregated Witness: design, deployment, bech32 addresses, malleability fix | 141–145, 147–149, 173, 350 |
| `taproot` | Taproot, Schnorr signatures, Tapscript, MAST | 114, 340–343, 386 |

#### Script & Smart Contracts
| Category | Description | Related BIPs |
|---|---|---|
| `covenants` | Covenant proposals: CTV, OP_CAT, OP_VAULT, TXHASH, APO, CSFS, LNHANCE, OP_CHECKCONTRACTVERIFY | 118, 119, 345–349, 443 |
| `script-opcodes` | Bitcoin Script, opcodes, P2SH, Miniscript, Simplicity, CLTV, CSV | 12, 16–18, 62, 65, 66, 68, 98, 112, 113, 116, 117, 379 |
| `vaults` | Bitcoin vaults: custody, clawback, time-delayed spending, OP_VAULT | 345 |
| `dlc` | Discreet Log Contracts, oracle-based contracts | 374 |

#### Digital Assets on Bitcoin
| Category | Description | Related BIPs |
|---|---|---|
| `ordinals-inscriptions` | Ordinal theory, Inscriptions, BRC-20, digital artifacts | — |
| `tokens-runes` | Runes protocol, colored coins, Counterparty, Omni, RGB, Taproot Assets, tokenization | — |

#### Layer 2 & Off-chain
| Category | Description | Related BIPs |
|---|---|---|
| `lightning` | Lightning Network: channels, HTLCs, routing, LN-Symmetry (eltoo), watchtowers, splicing, BOLTs | — |
| `l2-bridges` | L2 protocols: Ark, statechains, rollups, channel factories, ColliderVM | — |
| `sidechains-drivechain` | Sidechains, Drivechain (BIP 300/301), Liquid, federated/two-way pegs | 300, 301 |
| `bitvm` | BitVM/BitVMX, off-chain computation, fraud/validity proofs, ZK proofs, STARKs/SNARKs | — |
| `atomic-swaps` | Atomic swaps, cross-chain, HTLCs for swaps, submarine swaps | 197, 199 |

#### Privacy
| Category | Description | Related BIPs |
|---|---|---|
| `privacy` | CoinJoin, PayJoin, CoinSwap, Dandelion, confidential transactions, fungibility | 47, 78, 79, 126, 156 |
| `silent-payments` | Silent Payments (BIP 352): static addresses without address reuse | 351, 352, 375 |

#### Wallet & Key Management
| Category | Description | Related BIPs |
|---|---|---|
| `wallet-keys` | HD wallets, BIP39 mnemonics, descriptors, PSBTs, codex32, seed backups, key derivation | 32, 38, 39, 43–46, 48, 49, 67, 69, 83–89, 93, 124, 129, 174, 329, 370–374, 380–390 |
| `multisig-threshold` | Multisig, MuSig2, FROST, threshold signatures, key aggregation | 11, 45, 48, 67, 87, 327, 328, 373, 390 |

#### Mining
| Category | Description | Related BIPs |
|---|---|---|
| `mining` | PoW, ASICs, pools, Stratum, block templates, selfish mining, ASICBoost, fee sniping | 22, 23, 34, 42, 52, 310, 320 |

#### Mempool, Fees & Transaction Relay
| Category | Description | Related BIPs |
|---|---|---|
| `mempool-fees` | Mempool policy, RBF, CPFP, fee estimation, package relay, cluster mempool, V3/TRUC, pinning, ephemeral anchors | 125, 133, 331, 431, 433 |
| `spam-filtering` | Spam debate, censorship, OP_RETURN limits, standardness rules | — |

#### Network & P2P
| Category | Description | Related BIPs |
|---|---|---|
| `p2p-network` | P2P protocol, Erlay, BIP324 encrypted transport, compact blocks, Neutrino, Bloom filters, DNS seeds | 14, 31, 33, 35–37, 60, 61, 111, 130, 133, 150–159, 180, 324, 330, 338, 339, 434 |

#### Cryptography & Signatures
| Category | Description | Related BIPs |
|---|---|---|
| `signatures-sighash` | Signature schemes, sighash types, ECDSA, DER encoding | 66, 143, 146, 340 |
| `quantum` | Post-quantum cryptography, P2QRH, hash-based signatures, Lamport, FALCON, SPHINCS | 360 |

#### Data & Sync
| Category | Description | Related BIPs |
|---|---|---|
| `utxo-sync` | UTXO set management, AssumeUTXO, Utreexo, pruning, IBD, SwiftSync | — |
| `transaction-format` | Transaction format, txid/wtxid, normalized txid, transaction compression | 131, 134, 136, 140, 337, 339 |
| `data-structures` | Merkle trees, MATT framework, accumulators, commitment schemes | 98 |

#### Ecosystem & Process
| Category | Description | Related BIPs |
|---|---|---|
| `payment-protocol` | Payment protocol (BIP 70–75), bitcoin: URIs, BIP21, DNS payment instructions | 20, 21, 70–75, 321, 353 |
| `ecash` | Chaumian ecash, Cashu, Fedimint, blind signatures | — |
| `nostr` | Nostr protocol integration with Bitcoin | — |
| `scaling` | Scaling discussions: throughput, capacity, batching, CISA, signature aggregation | — |
| `security` | Security vulnerabilities, CVEs, responsible disclosure, DoS, double-spend attacks | — |
| `testing-devtools` | Signet, testnet, regtest, Bitcoin Inquisition, fuzzing, dev tooling | 94, 325 |
| `core-dev` | Bitcoin Core releases, build system (cmake/guix), repository governance | — |
| `bip-process` | BIP editorial process, governance, ossification, consensus-change philosophy | 1, 2, 3, 123 |
| `other` | Uncategorized — does not match any specific topic | — |

### Distribution Snapshot (Feb 2026)

Based on 27,172 messages across 16,931 threads (2011–2026), from bitcoin-dev mailing list and Delving Bitcoin.

```
Total threads:            16,931
Threads with BIP refs:     2,470  (14.6%)
Categorized (non-other):  12,249  (72.3%)
Uncategorized (other):     4,682  (27.7%)
Threads with 2+ categories: 4,734

Category                     Threads     %
--------------------------------------------
mining                         1,213   7.2%
hard-fork-block-size           1,116   6.6%
mempool-fees                     976   5.8%
payment-protocol                 763   4.5%
wallet-keys                      749   4.4%
covenants                        675   4.0%
script-opcodes                   640   3.8%
soft-fork-activation             540   3.2%
taproot                          539   3.2%
segwit                           465   2.7%
p2p-network                      454   2.7%
privacy                          445   2.6%
security                         348   2.1%
core-dev                         331   2.0%
spam-filtering                   284   1.7%
multisig-threshold               284   1.7%
lightning                        280   1.7%
bip-process                      270   1.6%
quantum                          256   1.5%
utxo-sync                        234   1.4%
testing-devtools                 212   1.3%
scaling                          197   1.2%
sidechains-drivechain            180   1.1%
signatures-sighash               138   0.8%
consensus-cleanup                126   0.7%
bitvm                             78   0.5%
tokens-runes                      77   0.5%
ordinals-inscriptions             68   0.4%
vaults                            59   0.3%
data-structures                   56   0.3%
l2-bridges                        44   0.3%
transaction-format                38   0.2%
silent-payments                   36   0.2%
atomic-swaps                      34   0.2%
ecash                             18   0.1%
dlc                               16   0.1%
nostr                             10   0.1%
other                          4,682  27.7%
```

### BIP Reference Rate by Category

Categories with high BIP-ref rates reflect mature, numbered standards.
Categories with low rates reflect topics that predate or live outside
the BIP process.

```
Category                     Threads  w/ BIP     %
----------------------------------------------------
wallet-keys                      749     563  75.2%
payment-protocol                 763     427  56.0%
silent-payments                   36      20  55.6%
p2p-network                      454     220  48.5%
consensus-cleanup                126      55  43.7%
bip-process                      270     104  38.5%
soft-fork-activation             540     167  30.9%
script-opcodes                   640     164  25.6%
segwit                           465     109  23.4%
signatures-sighash               138      18  13.0%
covenants                        675      88  13.0%
hard-fork-block-size           1,116     140  12.5%
multisig-threshold               284      30  10.6%
quantum                          256      27  10.5%
taproot                          539      55  10.2%
transaction-format                38       3   7.9%
mempool-fees                     976      72   7.4%
privacy                          445      27   6.1%
sidechains-drivechain            180      11   6.1%
atomic-swaps                      34       2   5.9%
mining                         1,213      48   4.0%
tokens-runes                      77       2   2.6%
spam-filtering                   284       7   2.5%
testing-devtools                 212       5   2.4%
security                         348       8   2.3%
vaults                            59       1   1.7%
scaling                          197       3   1.5%
ordinals-inscriptions             68       1   1.5%
utxo-sync                        234       3   1.3%
lightning                        280       3   1.1%
core-dev                         331       1   0.3%
bitvm                             78       0   0.0%
data-structures                   56       0   0.0%
l2-bridges                        44       0   0.0%
ecash                             18       0   0.0%
dlc                               16       0   0.0%
nostr                             10       0   0.0%
```

## bips.parquet
Contains Bitcoin Improvement Proposals metadata.

### Fields
- `bip_id` (string): BIP number (e.g., "1").
- `file_name` (string): File name in the repo.
- `title` (string): BIP title.
- `status` (string): Status (e.g., "Closed", "Deployed").
- `type` (string): Type (e.g., "Process", "Standard").
- `layer` (string): Layer (e.g., "Unknown", "Consensus").
- `created_date_header` (string): Creation date from header.
- `authors_json` (string): JSON list of authors.
- `author_canonical_ids` (string): List of canonical author IDs.
- `author_names` (string): List of author names.
- `git_created_at` (datetime): Git creation timestamp.
- `git_updated_at` (datetime): Git last update timestamp.
- `revision_count` (int): Number of revisions.
- `unique_git_contributors_count` (int): Number of unique contributors.

### Sample Records
```json
[
  {
    "bip_id": "1",
    "file_name": "bip-0001.mediawiki",
    "title": "BIP Purpose and Guidelines",
    "status": "Closed",
    "type": "Process",
    "layer": "Unknown",
    "created_date_header": "2011-09-19",
    "authors_json": "[{\"name\": \"Amir Taaki\", \"email\": \"genjix@riseup.net\", \"canonical_id\": \"genjix@riseup.net\"}]",
    "author_canonical_ids": "['genjix@riseup.net']",
    "author_names": "['Amir Taaki']",
    "git_created_at": "2011-10-29 05:39:58",
    "git_updated_at": "2025-10-08 16:59:36",
    "revision_count": 36,
    "unique_git_contributors_count": 12
  },
  {
    "bip_id": "2",
    "file_name": "bip-0002.mediawiki",
    "title": "BIP process, revised",
    "status": "Closed",
    "type": "Process",
    "layer": "Unknown",
    "created_date_header": "2016-02-03",
    "authors_json": "[{\"name\": \"Luke Dashjr\", \"email\": \"luke+bip@dashjr.org\", \"canonical_id\": \"luke+bip@dashjr.org\"}]",
    "author_canonical_ids": "['luke+bip@dashjr.org']",
    "author_names": "['Luke Dashjr']",
    "git_created_at": "2016-02-01 16:34:17",
    "git_updated_at": "2025-10-22 14:32:52",
    "revision_count": 83,
    "unique_git_contributors_count": 12
  },
  {
    "bip_id": "3",
    "file_name": "bip-0003.md",
    "title": "Updated BIP Process",
    "status": "Deployed",
    "type": "Process",
    "layer": "Unknown",
    "created_date_header": "2025-01-09",
    "authors_json": "[{\"name\": \"Murch\", \"email\": \"murch@murch.one\", \"canonical_id\": \"murch@murch.one\"}]",
    "author_canonical_ids": "['murch@murch.one']",
    "author_names": "['Murch']",
    "git_created_at": "2025-02-20 16:18:08",
    "git_updated_at": "2025-12-15 18:48:19",
    "revision_count": 52,
    "unique_git_contributors_count": 8
  }
]
```