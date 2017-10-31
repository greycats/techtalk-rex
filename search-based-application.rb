# encoding: utf-8

section "Search-based applications" do

  block <<-EOS
   * search with term

   * filters & tags

   * scoring & sorting

   * pagination
  EOS

  center <<-EOS
    # Searching in Redis

    ## Basic search theory
  EOS

  block <<-EOS
    Redis structures are ideally suited for
    making inverted index

    * SET (SADD, SINTERSTORE)

    * ZSET (ZADD, ZINTERSTORE, ZRANGE, ZCARD)

  EOS

  block <<-EOS
    docA: lord of the rings
    docB: lord of the dance

    ┌─ lord ─┐  ┌─  of  ─┐  ┌─ the  ─┐  ┌─ rings ─┐  ┌─ dance ─┐
    ├────────┤  ├────────┤  ├────────┤  ├─────────┤  ├─────────┤
    │  docA  │  │  docA  │  │  docA  │  │  docA   │  │  docB   │
    │  docB  │  │  docB  │  │  docB  │  └─────────┘  └─────────┘
    └────────┘  └────────┘  └────────┘

    known as parsing and tokenization
  EOS

  code <<-EOS, :javascript
  \e[0;37m// parsing\e[0m

  const metaphone = ...
  const stem = ...
  const tokenizer = ...
  const parse = (text) => {
    return tokenizer.tokenize(text).map(token => {
      return metaphone(stem(token))
    })
  }

  > parse(`All the best books are here
     at the Rain Coats Book Store`)
  [ \e[0;32m'AL'\e[0m, \e[0;32m'0'\e[0m, \e[0;32m'BST'\e[0m, \e[0;32m'BK'\e[0m, \e[0;32m'AR'\e[0m, \e[0;32m'HR'\e[0m,
    \e[0;32m'AT'\e[0m, \e[0;32m'0'\e[0m, \e[0;32m'RN'\e[0m, \e[0;32m'KT'\e[0m, \e[0;32m'BK'\e[0m, \e[0;32m'STR'\e[0m ]
  EOS

  code <<-EOS, :javascript
  \e[0;37m// indexing\e[0m

  const doc_id = ...
  const content = ...

  redis.\e[0;32mhset\e[0m('objects', doc_id, content)

  const tokens = parse(content).forEach(token => {
    redis.\e[0;32msadd\e[0m(`token:${token}`, doc_id)
  })
  EOS

  code <<-EOS, :javascript
  \e[0;37m// searching\e[0m

  const keys = parse(keyword).map(token => {
    return `token:${token}`
  })

  await redis.pipeline()
    .\e[0;32mzinterstore\e[0m(tkey, keys.length, ...keys)
    .expire(tkey, 30)
    .exec()

  const [[_, ids], [_, count]] = await redis.pipeline()
    .\e[0;32mzrange\e[0m(tkey, start, end)
    .\e[0;32mzcard\e[0m(tkey)
    .exec()

  const contents = await redis.\e[0;32mhmget\e[0m('objects', ...ids)
  EOS

  block <<-EOS
  DEMO - Basic search theory

  * attachments.yml

  * options

  * router

  EOS

  center <<-EOS
    # Searching in Redis

    ## Sorting search results
  EOS

  block <<-EOS
  SET -> ZSET

  Redis will consider the SET members to have scores of 1.

  EOS

  code <<-EOS, :javascript
  \e[0;37m// TF-IDF Weighting\e[0m

  const distance = ...

  const weight = distance(token, text)

  redis.\e[0;32mzadd\e[0m(`token:${token}`, weight, doc_id)
  EOS

  code <<-EOS, :javascript
  \e[0;37m// Field Sorting\e[0m

  const field = ...
  const score: (string) => number = ...

  const weight = score(object[field])

  redis.\e[0;32mzadd\e[0m(`sort:${field}`, weight, doc_id)
  EOS

  code <<-EOS, :javascript
  \e[0;37m// Search and sort\e[0m

  const sort, start, end = ...
  const tkey = ... (key to keep search result)

  const sorting = parseSorting(sort)

  if (sorting) {
    const [field, desc] = sorting
    redis.\e[0;32mzinterstore\e[0m(stkey, 2, tkey, `sort:${field}`, 'WEIGHTS', 0, 1)
    if (desc) {
      redis.\e[0;32mzrevrange\e[0m(stkey, start, end)
    } else {
      redis.\e[0;32mzrange\e[0m(stkey, start, end)
    }
  }
  EOS
end

section "References" do
  block <<-EOS
    * https://github.com/fxn/tkn

    * https://github.com/NaturalNode/natural

    * https://redislabs.com/ebook/part-2-core-concepts
  EOS
end
