# Relógio

Um relógio online para mostrar o horário atual, com vários estilos, fuso horário e um modo prova com contagem regressiva e avisos. Funciona em celular e computador, sem servidor e sem instalação.

## Funcionalidades

- **Três estilos de relógio:** digital, flip (com animação de virada) e analógico.
- **Fuso horário:** detecção automática pelo navegador ou escolha manual entre todos os fusos disponíveis. Pode ser mostrado ou ocultado.
- **Data:** pode ser mostrada ou ocultada.
- **Formato:** 24 horas ou 12 horas (com AM/PM).
- **Cores personalizáveis:**
  - Cor do fundo: preto, cinza escuro, cinza claro ou branco.
  - Cor do relógio: a cor escolhida fica no fundo do relógio analógico e dos cartões do flip, e no texto do digital. Números, traços e dígitos recebem contraste automático.
  - Cor dos textos: afeta a data, o fuso, o modo prova e o painel de configurações.
  - Cor do ponteiro: vermelho por padrão, com opções prontas ou cor personalizada.
- **Tela cheia:** botão no canto superior. Em tela cheia, a engrenagem some e o botão de sair fica discreto.
- **Modo prova:**
  - Defina horário de início e de fim (no fuso selecionado).
  - Mostre ou oculte os horários abaixo do relógio.
  - Mostre ou oculte a contagem regressiva. Ela mostra o tempo até o início, depois o tempo até o fim com barra de progresso, e por fim "Prova encerrada".
  - **Avisos:** escolha quais avisos quer receber (faltam 1 hora, 30 min, 15 min, 10 min, 5 min e 1 min). O aviso aparece acima do cronômetro e some após 1 minuto.

As configurações são salvas no navegador de quem usa (localStorage), então continuam após recarregar a página.

## Estrutura dos arquivos

```
.
├── index.html   # estrutura da página
├── style.css    # estilos e variáveis de cor
├── script.js    # lógica: fuso, relógios, cores, modo prova e avisos
└── README.md    # este arquivo
```

Não há dependências externas, nem frameworks, nem etapa de build.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `relogio`).
2. Envie para a raiz do repositório os arquivos `index.html`, `style.css` e `script.js` (o `README.md` é opcional).
3. No repositório, vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)`, e clique em **Save**.
5. Depois de alguns minutos, o site estará disponível em `https://SEU-USUARIO.github.io/relogio/`.

## Como executar localmente

Basta abrir o arquivo `index.html` em qualquer navegador moderno. Não é necessário servidor.

## Observações

- **Tela cheia no iPhone:** o Safari do iOS não permite tela cheia em páginas web, então o botão fica oculto nesse caso. Para uma experiência parecida, use "Adicionar à Tela de Início".
- **Avisos do modo prova:** os avisos dependem da aba estar aberta. Se o navegador suspender a página em segundo plano, o aviso pode aparecer assim que a aba voltar a ficar ativa.
- **Fuso:** os horários de início e fim do modo prova são interpretados no fuso selecionado, e não no fuso do computador.
