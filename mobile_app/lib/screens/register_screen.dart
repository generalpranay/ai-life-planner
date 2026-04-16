import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero)
        .animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic));
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    setState(() { _loading = true; _error = null; });
    final success = await AuthService.register(
      _emailCtrl.text.trim(),
      _passwordCtrl.text.trim(),
    );
    setState(() => _loading = false);
    if (!mounted) return;
    if (success) {
      Navigator.pop(context);
    } else {
      setState(() => _error = 'Registration failed. Try a different email.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      body: Stack(
        children: [
          Positioned(
            top: -100, right: -60,
            child: _GlowBlob(color: AppColors.cyan, opacity: isDark ? 0.14 : 0.08, size: 340),
          ),
          Positioned(
            bottom: -80, left: -40,
            child: _GlowBlob(color: AppColors.accent, opacity: isDark ? 0.12 : 0.07, size: 280),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
              child: FadeTransition(
                opacity: _fadeAnim,
                child: SlideTransition(
                  position: _slideAnim,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                              ),
                              child: Icon(Icons.arrow_back, size: 18,
                                  color: isDark ? AppColors.darkText : AppColors.lightText),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),
                        Center(
                          child: Container(
                            width: 72, height: 72,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [AppColors.cyan, Color(0xFF0369A1)],
                              ),
                              boxShadow: [BoxShadow(
                                color: AppColors.cyan.withValues(alpha: 0.35),
                                blurRadius: 24, offset: const Offset(0, 8),
                              )],
                            ),
                            child: const Icon(Icons.person_add_outlined,
                                color: Colors.white, size: 32),
                          ),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          'Create account',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              color: isDark ? AppColors.darkText : AppColors.lightText),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text('Start organizing your life today',
                            style: Theme.of(context).textTheme.bodyMedium,
                            textAlign: TextAlign.center),
                        const SizedBox(height: 40),
                        _FormCard(
                          isDark: isDark,
                          children: [
                            _Field(
                              controller: _emailCtrl,
                              label: 'Email',
                              icon: Icons.email_outlined,
                              keyboardType: TextInputType.emailAddress,
                              isDark: isDark,
                            ),
                            const SizedBox(height: 16),
                            _Field(
                              controller: _passwordCtrl,
                              label: 'Password',
                              icon: Icons.lock_outline,
                              obscureText: _obscurePassword,
                              isDark: isDark,
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  size: 20,
                                  color: isDark ? AppColors.darkMuted : AppColors.lightMuted,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 16),
                              _ErrorBanner(message: _error!),
                            ],
                            const SizedBox(height: 24),
                            _GradientButton(
                              onPressed: _loading ? null : _register,
                              loading: _loading,
                              label: 'Create Account',
                              colors: const [AppColors.cyan, Color(0xFF0369A1)],
                              glowColor: AppColors.cyan,
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('Already have an account? ',
                                style: Theme.of(context).textTheme.bodyMedium),
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: Text('Sign in',
                                style: GoogleFonts.inter(
                                  color: AppColors.accent,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                )),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shared sub-widgets ──────────────────────────────────────────────────────

class _GlowBlob extends StatelessWidget {
  final Color color;
  final double opacity;
  final double size;
  const _GlowBlob({required this.color, required this.opacity, required this.size});

  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: RadialGradient(
        colors: [color.withValues(alpha: opacity), Colors.transparent],
      ),
    ),
  );
}

class _FormCard extends StatelessWidget {
  final bool isDark;
  final List<Widget> children;
  const _FormCard({required this.isDark, required this.children});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
  );
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? suffixIcon;
  final bool isDark;

  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    required this.isDark,
    this.obscureText = false,
    this.keyboardType,
    this.suffixIcon,
  });

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    obscureText: obscureText,
    keyboardType: keyboardType,
    style: GoogleFonts.inter(
      fontSize: 14,
      color: isDark ? AppColors.darkText : AppColors.lightText,
    ),
    decoration: InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 18),
      suffixIcon: suffixIcon,
    ),
  );
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: AppColors.error.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.error.withValues(alpha: 0.30)),
    ),
    child: Row(children: [
      const Icon(Icons.error_outline, color: AppColors.error, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(message,
        style: GoogleFonts.inter(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.w500))),
    ]),
  );
}

class _GradientButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final bool loading;
  final String label;
  final List<Color> colors;
  final Color glowColor;

  const _GradientButton({
    required this.onPressed,
    required this.loading,
    required this.label,
    this.colors = const [AppColors.accent, Color(0xFF5B21B6)],
    this.glowColor = AppColors.accent,
  });

  @override
  State<_GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<_GradientButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => _hovered = true),
    onExit: (_) => setState(() => _hovered = false),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      height: 50,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(colors: widget.colors),
        boxShadow: widget.onPressed != null
          ? [BoxShadow(
              color: widget.glowColor.withValues(alpha: _hovered ? 0.50 : 0.30),
              blurRadius: _hovered ? 20 : 12,
              offset: const Offset(0, 4),
            )]
          : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: widget.onPressed,
          child: Center(
            child: widget.loading
              ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text(widget.label,
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
          ),
        ),
      ),
    ),
  );
}
