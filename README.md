# Balança

App de iPhone para balanças de bioimpedância **OKOK** (Chipsea), feito para substituir o app oficial:

- **Offline e privado.** Não tem conta nem nuvem; os dados ficam em SQLite no aparelho. Exporta CSV e faz backup em JSON.
- **Histórico e gráficos.** Gráfico de cada métrica com média móvel de 7 dias, períodos de 1M a Tudo, comparação entre duas pesagens e variação em 7 e 30 dias.
- **Multiusuário.** Cada pesagem vai sozinha para o perfil com peso mais próximo; se houver dúvida, o app pergunta.
- **Várias metas simultâneas.** Ex.: 80 kg até dezembro e 75 kg até junho. Cada meta mostra o progresso, o ritmo necessário, o ritmo atual (regressão dos últimos 28 dias) e a data prevista de chegada.

O protocolo BLE e as fórmulas vêm da engenharia reversa em
[100nandoo/okok-bia-formulas](https://github.com/100nandoo/okok-bia-formulas). Os testes verificam os resultados contra o `okok_ble_reader.py` original.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `src/core/` | Lógica pura em TypeScript, toda testada: parsers V20/V11/VF0/C0, fórmulas BIA, metas, matching de perfis, detecção de pesagem estável e CSV |
| `modules/okok-scanner/` | Módulo nativo em Swift (CoreBluetooth) que escuta os anúncios BLE da balança. A balança não aceita conexão, só transmite |
| `src/ble/` | Liga o scanner ao parser; no web usa um simulador que gera anúncios C0 reais |
| `src/db/` | Schema SQLite, migrações e consultas |
| `src/app/` | Telas (expo-router): Início, Pesar, Histórico, Metas e Ajustes |

## Desenvolvimento (Windows/WSL, sem Mac)

```bash
npm install
npm test            # vitest
npm run typecheck
npm run web         # app no navegador, com balança simulada
```

## Instalar no iPhone sem Mac e sem conta paga

1. Suba o repositório no GitHub. Em repositório **público**, os minutos de macOS são ilimitados.
2. A cada push na `main`, o workflow **iOS (.ipa sem assinatura)** compila o app. Baixe o artefato `Balanca-ipa` em *Actions*.
3. No Windows, instale o [Sideloadly](https://sideloadly.io) (precisa do iTunes e do iCloud baixados do site da Apple, não da Microsoft Store).
4. Conecte o iPhone por cabo, arraste o `Balanca.ipa` para o Sideloadly e entre com seu Apple ID gratuito.
5. No iPhone, ative *Ajustes › Privacidade e Segurança › Modo Desenvolvedor* e confie no seu Apple ID em *Ajustes › Geral › VPN e Gerenciamento de Dispositivos*.
6. Com Apple ID gratuito, o app expira em **7 dias**. Reinstale pelo Sideloadly (os dados são mantidos) ou use o [SideStore](https://sidestore.io), que renova no próprio iPhone.

## Primeira pesagem / diagnóstico

Se a balança não aparecer, abra *Ajustes › Diagnóstico Bluetooth* e suba na balança. Ela aparece no topo da lista, com o sinal mais forte, e mostra o *manufacturer data* em hex. Se a linha não ficar verde ("OKOK …"), anote o hex: é dele que o parser precisa.

> As métricas de composição corporal são estimativas e não substituem avaliação profissional.
