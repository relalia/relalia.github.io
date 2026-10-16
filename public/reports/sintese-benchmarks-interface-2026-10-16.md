# Benchmarks e melhorias de interface — síntese de 16/10/2026

2026-10-16

As médias dos quatro recortes seguiram trajetórias diferentes. Os ganhos se concentram em poucas perguntas e os adversários fixos também mudaram de nota. Em paralelo, seis capturas documentam avanços de interface, sem demonstrar relação causal com os resultados dos benchmarks.

Execuções em 09 e 14/10 (ChatGPT) e 13 e 15/10/2026 (Claude). São duas observações por conjunto, dentro do período de 09 a 15/10; não há uma série diária de quatorze dias. As capturas pertencem à rodada de 16/10.

Cinco perguntas por benchmark. Notas de concordância com referências humanas, sem validação jurídica independente. Conjuntos e juízes diferentes; esta figura não representa um confronto direto entre ChatGPT e Claude nem um ranking geral.

## Resumo do VadeChat

| Benchmark | Modo | Run 01 | Run 02 | Variação | Subiram / caíram / iguais | n por execução |
|---|---|---:|---:|---:|---|---:|
| VadeChat × ChatGPT | Ágil | 4,6 | 5,8 | +1,2 | 3 / 2 / 0 | 5 |
| VadeChat × ChatGPT | Pleno | 7,4 | 6,8 | -0,6 | 2 / 2 / 1 | 5 |
| VadeChat × Claude | Ágil | 7,0 | 7,5 | +0,5 | 2 / 2 / 1 | 5 |
| VadeChat × Claude | Pleno | 7,8 | 8,4 | +0,6 | 2 / 3 / 0 | 5 |

## Médias das quatro séries por benchmark

| Benchmark | Série | Run 01 | Run 02 | Variação | Denominador em cada execução |
|---|---|---:|---:|---:|---:|
| VadeChat × ChatGPT | VadeChat Ágil | 4,6 | 5,8 | +1,2 | 5 |
| VadeChat × ChatGPT | VadeChat Pleno | 7,4 | 6,8 | -0,6 | 5 |
| VadeChat × ChatGPT | ChatGPT gratuito contra Ágil | 7,0 | 6,2 | -0,8 | 5 |
| VadeChat × ChatGPT | ChatGPT gratuito contra Pleno | 5,8 | 6,4 | +0,6 | 5 |
| VadeChat × Claude | VadeChat Ágil | 7,0 | 7,5 | +0,5 | 5 |
| VadeChat × Claude | VadeChat Pleno | 7,8 | 8,4 | +0,6 | 5 |
| VadeChat × Claude | Claude gratuito contra Ágil | 7,1 | 7,0 | -0,1 | 5 |
| VadeChat × Claude | Claude gratuito contra Pleno | 7,0 | 6,4 | -0,6 | 5 |

Segmentos retos ligam apenas Run 01 e Run 02 da mesma série. Não há interpolação temporal, tendência estimada ou comparação direta entre os conjuntos.

Média = soma das notas válidas / quantidade utilizada. Variação = média do Run 02 − média do Run 01, nas mesmas perguntas. Contribuição por pergunta = diferença da nota / 5.

## VadeChat × ChatGPT

Execuções: 2026-10-09 e 2026-10-14. Juiz: Claude Sonnet 5.5 Médio · acesso gratuito declarado. Adversário: ChatGPT gratuito · modelo não identificado · uso sem login informado pelo executor. Revisor: GPT 6.1 Sol Alto · acesso pago declarado.

No Ágil, Q02 soma +5 pontos, ou +1,0 da média: a maior parte do ganho líquido de +1,2. No Pleno, Q02 contribui +0,6, mas Q04 retira 1,2 ponto da média; o saldo é −0,6.

5/10 embates mudaram a nota da resposta adversária idêntica.

| Questão | Modo | VC Run 01 | VC Run 02 | Diferença | Contribuição à média | Adversário Run 01 → Run 02 |
|---|---|---:|---:|---:|---:|---|
| Q01 | Ágil | 2,0 | 3,0 | +1,0 | +0,2 | 5,0 → 5,0 |
| Q01 | Pleno | 5,0 | 6,0 | +1,0 | +0,2 | 5,0 → 5,0 |
| Q02 | Ágil | 2,0 | 7,0 | +5,0 | +1,0 | 10,0 → 9,0 |
| Q02 | Pleno | 4,0 | 7,0 | +3,0 | +0,6 | 9,0 → 9,0 |
| Q03 | Ágil | 10,0 | 9,0 | -1,0 | -0,2 | 10,0 → 10,0 |
| Q03 | Pleno | 10,0 | 10,0 | 0,0 | 0,0 | 10,0 → 10,0 |
| Q04 | Ágil | 1,0 | 3,0 | +2,0 | +0,4 | 6,0 → 4,0 |
| Q04 | Pleno | 8,0 | 2,0 | -6,0 | -1,2 | 3,0 → 5,0 |
| Q05 | Ágil | 8,0 | 7,0 | -1,0 | -0,2 | 4,0 → 3,0 |
| Q05 | Pleno | 10,0 | 9,0 | -1,0 | -0,2 | 2,0 → 3,0 |

Revisões — síntese editorial: As revisões questionam descontos e a sustentação de diferenças de pontuação. Em Q05, solicitam inconclusividade global quanto à validade da ficha, mantendo apenas uma comparação delimitada dos requisitos. Os resultados originais continuam no histórico; a revisão não os substitui.

[Comparativo completo e evidências](https://relalia.github.io/relatorios/benchmark-comparativo-2026-10-14/)

## VadeChat × Claude

Execuções: 2026-10-13 e 2026-10-15. Juiz: ChatGPT Grátis · modelo não identificado. Adversário: Claude gratuito · Sonnet 5.5 Médio exibido, com login, conforme informação do executor. Revisor: GPT 6.1 Sol Alto · acesso pago declarado.

Q03 contribui +0,6 à média do Ágil e +0,8 à do Pleno, acima dos ganhos líquidos de +0,5 e +0,6. As outras quatro perguntas somadas reduzem essas médias em 0,1 e 0,2 ponto. No Pleno, Q04 perde cobertura.

4/10 embates mudaram a nota da resposta adversária idêntica.

| Questão | Modo | VC Run 01 | VC Run 02 | Diferença | Contribuição à média | Adversário Run 01 → Run 02 |
|---|---|---:|---:|---:|---:|---|
| Q01 | Ágil | 5,5 | 4,5 | -1,0 | -0,2 | 10,0 → 10,0 |
| Q01 | Pleno | 9,5 | 9,0 | -0,5 | -0,1 | 9,5 → 9,5 |
| Q02 | Ágil | 7,5 | 7,5 | 0,0 | 0,0 | 6,5 → 6,5 |
| Q02 | Pleno | 8,5 | 7,5 | -1,0 | -0,2 | 6,5 → 6,5 |
| Q03 | Ágil | 7,0 | 10,0 | +3,0 | +0,6 | 4,5 → 4,5 |
| Q03 | Pleno | 6,0 | 10,0 | +4,0 | +0,8 | 5,5 → 3,5 |
| Q04 | Ágil | 8,0 | 9,0 | +1,0 | +0,2 | 7,0 → 6,0 |
| Q04 | Pleno | 9,0 | 7,5 | -1,5 | -0,3 | 6,0 → 5,0 |
| Q05 | Ágil | 7,0 | 6,5 | -0,5 | -0,1 | 7,5 → 8,0 |
| Q05 | Pleno | 6,0 | 8,0 | +2,0 | +0,4 | 7,5 → 7,5 |

Revisões — síntese editorial: As revisões questionam as notas máximas de Q03 e alguns descontos e margens. O prazo de 30 dias da simplificada para incorporação já existia no Ágil inicial; a dispensa do art. 808 já era desenvolvida no Pleno. O reteste amplia outros pontos e reformula esse conteúdo. Permanece separada a ressalva sobre o prazo atribuído à certidão específica pela referência.

[Comparativo completo e evidências](https://relalia.github.io/relatorios/benchmark-comparativo-claude-2026-10-15/)

## Melhorias de interface

### VC-UI-16A · Modo identificado em cada resposta

Atendimento parcial documentado

**Imagem:** As capturas 1 e 2 exibem Pleno e Ágil junto aos controles das respectivas respostas. Na captura 1, a resposta indica Pleno enquanto o compositor está em Ágil.

**Relato:** O usuário informa que as respostas agora apresentam o modo utilizado. As imagens mostram os rótulos, sem comprovar a configuração efetiva do backend.

**Utilidade:** Permite reconhecer o modo associado a cada resposta mesmo após mudar a seleção do compositor; melhora a rastreabilidade para o usuário.

**Limites:** Atende à indicação do modo no escopo de VC-TRACE-14. Modelo interno, regeneração, persistência ao reabrir e execução do backend não são demonstrados.

[ALIA16-EV-01 — captura original](https://relalia.github.io/originals/2026-10-16/captura-01.png) · SHA-256: f9600d80575fda6feabfb1ea483494a4899e4a0f944ec00c5eba1809a79b8849

[ALIA16-EV-02 — captura original](https://relalia.github.io/originals/2026-10-16/captura-02.png) · SHA-256: 579e8eb95d5e5517378776b8df9fead56612a9356a5d244beb765158639a02b5

[Escopo anterior: modo, modelo e regeneração](https://relalia.github.io/relatorios/alia-2026-10-08/#VC-TRACE-14)


### GIRO-UI-16B · Resumo expansível e ação do VadeChat em destaque

Atendimento parcial documentado

**Imagem:** A captura 3 mostra o controle Mostrar mais e um botão rotulado Perguntar ao VadeChat, visualmente maior que a ação compacta documentada anteriormente.

**Relato:** O usuário informa que Mostrar mais expande o resumo e que o botão ganhou área de interação. A imagem isolada não mostra a expansão nem mede a área acionável.

**Utilidade:** Facilita encontrar a continuação do resumo e reconhecer a ação de consulta; espera-se facilitar o toque, sem medição de velocidade ou taxa de cliques.

**Limites:** Atendimento parcial de GIRO-UX-01: detalhe pelo card, resumo integral, teclado, ajuda contextual e tratamento de casos especiais não foram verificados.

[ALIA16-EV-03 — captura original](https://relalia.github.io/originals/2026-10-16/captura-03.png) · SHA-256: 9dac089ded86ebe4fbedc61f07623e6e53ced1cb2aa6e383a32b0e869b34fb81

[Escopo anterior dos cards e da ação de consulta](https://relalia.github.io/relatorios/alia-2026-10-08/#GIRO-UX-01)


### VC-UI-16C · Compositor ampliado para o texto vindo do GIRO

Atendimento parcial documentado

**Imagem:** A captura 4 mostra a mensagem pré-inserida sobre a notícia em um campo ampliado, com rolagem interna. Parte do conteúdo continua fora da área visível.

**Relato:** O usuário informa a adequação da altura do campo quando a consulta vem do GIRO; a imagem mostra esse estado preenchido.

**Utilidade:** Oferece mais espaço para conferir e editar o contexto antes de enviar, mantendo a rolagem para textos extensos.

**Limites:** Não demonstra que todo o texto fica visível, crescimento ilimitado, envio automático do GIRO ou retorno à altura inicial após limpar/enviar. Esses pontos dos escopos anteriores permanecem sem confirmação.

[ALIA16-EV-04 — captura original](https://relalia.github.io/originals/2026-10-16/captura-04.png) · SHA-256: 25320905d230022707f338e7a06a1c5fe59dc3532668bf49c275de87b04f5d55

[Escopo anterior da altura após envio e limpeza](https://relalia.github.io/relatorios/vadechat-2026-10-06/#VC-UX-05)

[Escopo anterior do fluxo GIRO → VadeChat](https://relalia.github.io/relatorios/vadechat-2026-10-06/#VC-FLOW-06)


### VC-UI-16D · Chip do hero inicia a consulta

Atendimento parcial documentado

**Imagem:** As capturas 5 e 6 mostram o chip Prazo da prenotação na tela inicial, sua mensagem enviada na conversa e o estado Pesquisando na base.

**Relato:** Segundo o usuário, clicar no chip já inicia a conversa com seu conteúdo. As imagens são compatíveis com essa sequência, mas não registram o clique em si.

**Utilidade:** Reduz as etapas para iniciar a consulta com uma sugestão, sem medição de tempo.

**Limites:** O carregamento não comprova resposta concluída. O achado VC-UX-02 também abrangia texto digitado, Enter, envio único e recuperação de erro; seu escopo completo não pode ser marcado como resolvido.

[ALIA16-EV-05 — captura original](https://relalia.github.io/originals/2026-10-16/captura-05.png) · SHA-256: aa705f8eec06980e7f53bcf340b8ca008616bf68f97947340e098dc0c38ae489

[ALIA16-EV-06 — captura original](https://relalia.github.io/originals/2026-10-16/captura-06.png) · SHA-256: 1e5f52943a423d304685f14de3fcb3c23635d07ac2ceabf9a08e4efeb98d6552

[Escopo anterior do início com um único envio](https://relalia.github.io/relatorios/today/#VC-UX-02)


## Método e limitações

- As perguntas de um conjunto não correspondem às de outro, mesmo quando usam Q01–Q05. Não foi calculada uma média que misture os dois benchmarks.

- Média = soma das notas válidas / quantidade utilizada. Cada média utiliza cinco notas; a variação compara as mesmas cinco perguntas pareadas. Não há arredondamento intermediário. Campos estruturados vazios no Run 02 não foram tratados como zero: os valores vieram dos pareceres.

- Conclusão e orientação prática: 0–4; fundamentação e informações essenciais: 0–4; condições, limites e ressalvas: 0–2. Pontuação, classificação e vencedor originais foram preservados. A revisão permanece separada e não constitui validação jurídica independente.

- Perguntas, referências, fatos/pesos registrados, protocolo-base, alternância e respostas adversárias foram comparados dentro de cada benchmark por conteúdo e SHA-256. A procedência das respostas reutilizadas também foi conferida pela cadeia declarada de execução, registro, versão e hash; igualdade textual sozinha não comprova origem.

- Os legados não registram prompts completos ou instruções de revisão. No Run 02, a seleção segue o prompt vinculado à versão do parecer, com dependências e A/B, e não simplesmente o último arquivo. O rascunho v2 de Q03 Ágil do conjunto ChatGPT, sem envio declarado e sem julgamento vinculado, foi excluído da análise.

- Identidades e configurações são declarações locais do executor. O modelo do participante ChatGPT e o do juiz ChatGPT não estão identificados; o plano gratuito não permite deduzi-los. Há lacunas e flags de identificação inconsistentes nos metadados históricos, detalhadas nos comparativos.

- As capturas mostram estados da interface. A ação de expandir o resumo e o início de conversa ao clicar no chip são relatos do usuário apoiados pelas imagens, sem teste independente da Alia nesta rodada. Não houve medição de custo, latência, cliques, produtividade ou limites dos planos. As melhorias visuais não explicam, por si, mudanças de nota.

[Página e gráficos](https://relalia.github.io/relatorios/sintese-benchmarks-interface-2026-10-16/) · [PDF](https://relalia.github.io/reports/sintese-benchmarks-interface-2026-10-16.pdf) · [Dados](https://relalia.github.io/reports/sintese-benchmarks-interface-2026-10-16-dados.json) · [Índice gerado](https://relalia.github.io/reports/sintese-benchmarks-interface-2026-10-16-fontes.json)
