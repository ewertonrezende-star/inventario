export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      inv_artigos: Table<
        { codigo_artigo: string; descricao: string; iva: number | null; preco_custo: number | null; ativo: boolean; atualizado_em: string },
        { codigo_artigo: string; descricao: string; iva?: number | null; preco_custo?: number | null; ativo?: boolean; atualizado_em?: string },
        { codigo_artigo?: string; descricao?: string; iva?: number | null; preco_custo?: number | null; ativo?: boolean; atualizado_em?: string }
      >;
      inv_codigos_barras: Table<
        { id: number; codigo_barras: string; codigo_artigo: string; criado_em: string },
        { id?: number; codigo_barras: string; codigo_artigo: string; criado_em?: string },
        { id?: number; codigo_barras?: string; codigo_artigo?: string; criado_em?: string }
      >;
      inv_contagens: Table<
        { id: string; inventario_id: string; codigo_artigo: string; codigo_barras_lido: string | null; quantidade: number; utilizador_id: string | null; dispositivo_id: string | null; contado_em: string },
        { id?: string; inventario_id: string; codigo_artigo: string; codigo_barras_lido?: string | null; quantidade: number; utilizador_id?: string | null; dispositivo_id?: string | null; contado_em?: string },
        { id?: string; inventario_id?: string; codigo_artigo?: string; codigo_barras_lido?: string | null; quantidade?: number; utilizador_id?: string | null; dispositivo_id?: string | null; contado_em?: string }
      >;
      inv_inventarios: Table<
        { id: string; loja: string; nome: string; estado: string; criado_por: string | null; criado_em: string; fechado_em: string | null },
        { id?: string; loja: string; nome?: string; estado?: string; criado_por?: string | null; criado_em?: string; fechado_em?: string | null },
        { id?: string; loja?: string; nome?: string; estado?: string; criado_por?: string | null; criado_em?: string; fechado_em?: string | null }
      >;
      inv_perfis: Table<
        { user_id: string; nome: string | null; loja: string; perfil: string; ativo: boolean },
        { user_id: string; nome?: string | null; loja: string; perfil?: string; ativo?: boolean },
        { user_id?: string; nome?: string | null; loja?: string; perfil?: string; ativo?: boolean }
      >;
      inv_stock_lojas: Table<
        { id: number; codigo_artigo: string; armazem: string; stock_atual: number; atualizado_em: string },
        { id?: number; codigo_artigo: string; armazem: string; stock_atual?: number; atualizado_em?: string },
        { id?: number; codigo_artigo?: string; armazem?: string; stock_atual?: number; atualizado_em?: string }
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R } ? R : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = { public: { Enums: {} } } as const;
