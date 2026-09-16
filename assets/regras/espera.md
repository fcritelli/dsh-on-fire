## Esperar subagente ou job: notificação, não polling

**Nada aqui é espera fixa.** O `timeout_ms` é **teto, não duração**: medido em 2026-09-15, um job
de 45 s com teto de 180 s voltou em ~45 s. Use teto generoso sem medo — ele só protege contra job
travado, nunca faz você esperar até o fim.

Existem dois mecanismos, e nenhum deles é laço de verificação:

1. **Subagente em background: o runtime avisa.** Quando o filho assenta, chega uma notificação com
   o desfecho e a mensagem final dele. **Não há o que checar.** Continue trabalhando; a notificação
   chega sozinha. Verificar antes disso não antecipa nada e gasta token.
2. **Job em background: uma chamada que retorna no término.**
   `job_output(job_id, wait: true, timeout_ms: 180000)` — bloqueia até o job terminar **ou** o teto
   estourar. Volta no término.

**Cada verificação é uma chamada e um resultado que fica no contexto** — é isso que torna polling
caro. Uma chamada com `wait` custa o mesmo que uma verificação manual, mas substitui todas.

**Enquanto espera, faça trabalho local**: atualizar o ledger, preparar o pacote de review, ler o
relatório da tarefa anterior, despachar outra tarefa independente. Só espere parado se
genuinamente não houver nada a fazer — e aí é uma chamada, não um laço.

**Nunca** crie job de espera com `sleep` longo nem watcher em bash para vigiar outro processo: é um
processo a mais e não avisa mais rápido. E nunca verifique de segundos em segundos.

**Se o teto estourar sem resposta**, recheque o estado (`job_list`, `list_agents`, `git status`) e
decida se abre outra janela — ou mate com `job_kill` o que deixou de importar.
