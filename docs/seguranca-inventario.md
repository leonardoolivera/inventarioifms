# Seguranca do Inventario

Este projeto iniciou uma fase de endurecimento de seguranca com foco em tres frentes:

- autenticacao mais forte para servidores
- regras de acesso mais restritas no Supabase
- controles basicos contra abuso e uploads indevidos

## O que entrou nesta fase

- suporte de frontend para login por `SIAPE + PIN`
- Edge Function dedicada para autenticar SIAPE sem expor o PIN no cliente
- cadastro de `PIN inicial` na tela administrativa
- troca de PIN pelo proprio servidor em `Configuracoes`
- coluna `pin` prevista no schema
- pacote SQL em [security-hardening.sql](/C:/Users/leo-a/OneDrive/Documentos/New%20project/inventarioifms/supabase/security-hardening.sql)

## Estrategia de transicao

Para nao quebrar a operacao atual de uma vez:

- o frontend foi preparado para PIN
- a Edge Function `auth-siape` aceita fallback legado se a variavel `ALLOW_SIAPE_ONLY_LOGIN=true` estiver ativa
- o app ainda pode operar no modo antigo enquanto o banco e os cadastros sao migrados

Quando o banco estiver pronto e os PINs cadastrados:

1. publique `supabase/functions/auth-siape`
2. aplique [security-hardening.sql](/C:/Users/leo-a/OneDrive/Documentos/New%20project/inventarioifms/supabase/security-hardening.sql)
3. cadastre PIN para os servidores
4. desligue o fallback legado no ambiente
5. ative `AUTH_REQUIRE_PIN = true`

## Proximos passos recomendados

- migrar todos os servidores para PIN de 4 a 6 digitos
- revisar policies de `storage.objects`
- configurar o hook `private.check_rate_limit` em `db_pre_request`
- remover o fallback legado depois da migracao
- revisar periodicamente os logs do Supabase durante o inventario
