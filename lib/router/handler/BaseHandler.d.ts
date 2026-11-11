import { HttpResponseModel } from "../../@types/http";
export default class BaseHandler {
    event: any;
    context: null;
    env: NodeJS.ProcessEnv;
    /** Métodos (rotas) que não exigem autenticação */
    publicMethods: string[];
    /** Métodos (rotas) que não devem logar entrada nem saída */
    noLogMethods: string[];
    handle(event: any, context: any, method: any): Promise<{
        statusCode: number;
        body: any;
        headers: any;
    }>;
    setFunctionContext(event: any, context: any): void;
    static httpResponse(data: HttpResponseModel): {
        statusCode: number;
        body: any;
        headers: any;
    };
    isAuthorized(): boolean;
    /**
     * Confere o cabeçalho `Authorization` contra `authToken` e, durante a troca da credencial, também contra
     * `authTokenNext`; quando casa, registra qual dos dois foi usado, sem o valor.
     */
    authHeaderIsTheSameInTheEnvironment(): boolean;
    credencialUsada(): CredencialUsada | null;
    registrarCredencialUsada(credencial: CredencialUsada): void;
}
/** Qual valor da credencial casou: o atual (`authToken`), o próximo (`authTokenNext`) ou nenhum, quando o serviço não tem `authToken`. */
export type CredencialUsada = "antiga" | "nova" | "nenhuma-configurada";
/** Marca da linha de log que diz qual credencial casou — é por ela que se conta quem ainda usa o valor antigo. */
export declare const EVENTO_CREDENCIAL_USADA = "credencial-do-gateway";
