# SimpleClock

Um site limpo para tudo que envolve tempo: relógio, cronômetro, temporizador, modo estudo com pausas, lembretes e modo prova. Funciona no celular e no computador, sem servidor e sem instalação.

## Modos

Os modos ficam na barra inferior. Ao sair, o site reabre no último modo usado.

| Modo | O que faz |
| --- | --- |
| 🕐 **Horário** | Horário atual nos estilos digital, flip ou analógico. Pode mostrar data e fuso. |
| ⏱ **Cronômetro** | Inicia, pausa, zera e registra voltas (parcial e total). Estilo digital ou flip. |
| ⏳ **Temporizador** | Define horas, minutos e segundos. Inicia, pausa e reinicia. Pode mostrar o tempo inicial e uma barra de progresso (ambos ativáveis em Configurações). Ao acabar, toca um som e mostra um aviso. |
| 📚 **Estudo** | Sequência de blocos de estudo e pausas. Pode repetir um número de vezes, repetir até um horário final ou repetir indefinidamente. Há a opção de usar o horário como base: cada bloco aparece com o horário em que começa (ex.: `19:02 Foco · 15 min (Estudo)`). Estilos prontos: Pomodoro 25/5, Longo 50/10 e Curto 15/3. |
| 🔔 **Lembretes** | Lembretes com horário e texto, de uma vez ou todo dia. Na hora marcada aparece um aviso, toca um som e, se permitido, chega uma notificação do navegador. |
| 📝 **Prova** | Mostra o horário de início e fim, a contagem regressiva e a barra de progresso. Envia avisos antes do fim (1 hora, 30, 15, 10, 5 e 1 minuto). |

Para esconder a barra de modos, use o botão ✕ no final dela. Um botão ☰ no canto inferior direito a mostra de novo. Em tela cheia, a barra fica oculta.

O analógico existe apenas no relógio. Cronômetro, temporizador, estudo e prova usam os estilos digital ou flip.

## Configurações

O botão ⚙ abre o painel. Ele mostra só as abas que fazem sentido no modo atual:

- **Sempre:** Geral, Aparência e Relógio.
- **Relógio:** também Fuso horário.
- **Temporizador:** também a duração padrão.
- **Estudo:** também a sequência de blocos.
- **Lembretes:** também notificações.
- **Prova:** também fuso horário e configurações da prova.

Em **Aparência** você escolhe a cor do fundo, do relógio, dos textos e a **cor de destaque**, usada no ponteiro dos segundos, nas barras de progresso, nos botões principais e nos avisos. A cor do texto não pode ser igual à do fundo. Se você tentar, aparece um aviso. Se mudar o fundo para a cor do texto, o texto muda para o contraste.

Os cartões do flip têm um tom levemente diferente da cor do relógio e uma borda sutil, então continuam visíveis mesmo com fundo e relógio na mesma cor.

## Tela sempre ligada

O site pede ao navegador para manter a tela acesa enquanto está aberto. Isso usa a API Screen Wake Lock, suportada no Chrome, Edge, Safari do iOS 16.4 ou mais novo e na maioria dos navegadores modernos. Se o navegador não permitir, a tela pode apagar normalmente.

## Estrutura dos arquivos

```
.
├── index.html        # estrutura da página, barra de modos e painel de configurações
├── style.css         # estilos, variáveis de cor e barra de rolagem
├── js/
│   ├── config.js     # constantes, paletas, valores padrão e configurações salvas
│   ├── time.js       # fuso horário e formatação de horários
│   ├── display.js    # relógios digital, flip e analógico, avisos e sons
│   ├── modes.js      # lógica de cada modo e loop principal
│   ├── settings.js   # tema, painel de configurações e sincronização
│   └── app.js        # eventos, troca de modos, tela cheia, tela ligada e início
└── README.md
```

Os arquivos são carregados em ordem pelo `index.html`, sem módulos ES, então o site funciona até abrindo o `index.html` direto no computador. Não há dependências externas (exceto a fonte Outfit), frameworks nem etapa de build.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `relogio`).
2. Envie para a raiz do repositório o `index.html`, o `style.css` e a pasta `js/` (com os quatro arquivos dentro). O `README.md` é opcional.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)` e clique em **Save**.
5. Depois de alguns minutos, o site estará em `https://SEU-USUARIO.github.io/relogio/`.

## Como usar localmente

Abra o `index.html` em um navegador moderno. Não é preciso servidor.

## Observações

- **Menus com inatividade:** no computador, a barra de modos e os botões de tela cheia e configurações somem após 15 segundos sem uso (o botão ✕ de sair da tela cheia continua visível). No celular, os menus não somem.

- **Tela cheia no iPhone:** o Safari do iOS não permite tela cheia em páginas web, então o botão fica oculto. Para uma experiência parecida, use "Adicionar à Tela de Início".
- **Sons e avisos:** os sons dependem de um toque na página, exigência dos navegadores. Os avisos só disparam com a aba aberta.
- **Dados salvos:** configurações, lembretes e a última posição do menu ficam no navegador de quem usa. Cronômetro, temporizador, estudo e voltas são reiniciados ao recarregar a página.
- **Fuso no modo prova:** os horários são interpretados no fuso selecionado, e não no fuso do computador.
