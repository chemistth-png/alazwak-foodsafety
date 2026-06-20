import { useState } from "react";
import { ChevronDown, Shield, TrendingUp, Users, Zap, CheckCircle, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // FAQ Data
  const faqs = [
    {
      id: "faq-1",
      question: "ما هي اشتراطات هيئة سلامة الغذاء لمصانع الأغذية؟",
      answer:
        "تشمل الاشتراطات الأساسية: توفير بيئة صحية نظيفة، التحكم في درجات الحرارة، توفير مياه نظيفة معتمدة، تدريب العاملين على النظافة والسلامة، وتطبيق نظام HACCP. يجب الحصول على شهادة ترخيص من الهيئة قبل بدء العمليات.",
    },
    {
      id: "faq-2",
      question: "كيف أطبق نظام HACCP في مصنعي؟",
      answer:
        "يتطلب تطبيق HACCP سبع خطوات أساسية: تحليل المخاطر، تحديد نقاط التحكم الحرجة، وضع حدود حرجة، إنشاء نظام مراقبة، تحديد إجراءات تصحيحية، وضع نظام توثيق، والتحقق من فعالية النظام. يمكن استخدام أدوات متخصصة مثل Alazwak لتسهيل هذه العملية.",
    },
    {
      id: "faq-3",
      question: "ما الفرق بين ISO 9001 و ISO 22000 و FSSC 22000؟",
      answer:
        "ISO 9001 هو معيار إدارة الجودة العام. ISO 22000 هو معيار متخصص لإدارة سلامة الغذاء. FSSC 22000 هو معيار أكثر صرامة يجمع بين ISO 22000 مع متطلبات إضافية للسلامة الغذائية. FSSC 22000 يوفر مستوى أعلى من الحماية والموثوقية.",
    },
    {
      id: "faq-4",
      question: "ما هي الحدود الميكروبية والكيميائية المسموحة؟",
      answer:
        "تختلف الحدود حسب نوع المنتج الغذائي. مثلاً: البكتيريا المسببة للأمراض يجب أن تكون غير موجودة (0 CFU/g)، بينما البكتيريا الكلية لا تتجاوز 10^5 CFU/g. للمواد الكيميائية، يتم تحديد حدود قصوى للمبيدات والمعادن الثقيلة حسب معايير الهيئة.",
    },
    {
      id: "faq-5",
      question: "كم تكلفة الحصول على شهادة سلامة الغذاء؟",
      answer:
        "تختلف التكاليف حسب حجم المنشأة ونوع المنتج. عادة تتراوح بين 2000 إلى 10000 جنيه مصري للفحوصات الأولية. هناك تكاليف إضافية للاستشارات والتدريب والفحوصات الدورية.",
    },
    {
      id: "faq-6",
      question: "كيف يمكن Alazwak مساعدتي في إدارة سلامة الغذاء؟",
      answer:
        "يوفر Alazwak أدوات ذكية لتحليل المخاطر، إنشاء خطط HACCP، توثيق العمليات، إدارة الفحوصات، وتتبع الامتثال. كما يوفر نماذج جاهزة وتقارير شاملة تساعدك على الامتثال للمعايير الدولية.",
    },
  ];

  // Testimonials Data
  const testimonials = [
    {
      id: "test-1",
      name: "أحمد محمود",
      role: "مدير الجودة - مصنع الألبان الحديث",
      content:
        "استخدام Alazwak غيّر طريقة إدارتنا لسلامة الغذاء. الأداة سهلة الاستخدام وساعدتنا على الحصول على شهادة ISO 22000 في وقت قياسي.",
      rating: 5,
      image: "👨‍💼",
    },
    {
      id: "test-2",
      name: "فاطمة علي",
      role: "صاحبة مشروع - مخبزة تقليدية",
      content:
        "كنت قلقة من التعقيدات، لكن Alazwak جعل كل شيء واضحاً ومنظماً. الآن أنا واثقة من سلامة منتجاتي وأستطيع التركيز على النمو.",
      rating: 5,
      image: "👩‍💼",
    },
    {
      id: "test-3",
      name: "محمد سالم",
      role: "مهندس سلامة غذائية - شركة تصدير",
      content:
        "الأداة توفر رؤى قيمة وتقارير تفصيلية تساعد في اتخاذ القرارات. دعم الفريق ممتاز والاستجابة سريعة لأي استفسارات.",
      rating: 5,
      image: "👨‍🔬",
    },
    {
      id: "test-4",
      name: "ليلى محمد",
      role: "مديرة العمليات - مصنع المعجنات",
      content:
        "توفير الوقت والموارد كان الفائدة الأساسية. بدلاً من ساعات من الأوراق والملفات، كل شيء منظم رقمياً وسهل التتبع.",
      rating: 4,
      image: "👩‍💼",
    },
  ];

  // Statistics Data
  const statistics = [
    {
      number: "500+",
      label: "منشأة غذائية",
      description: "تستخدم Alazwak لإدارة سلامة الغذاء",
    },
    {
      number: "95%",
      label: "معدل الامتثال",
      description: "للمعايير الدولية بين مستخدمينا",
    },
    {
      number: "10+",
      label: "سنوات الخبرة",
      description: "في مجال سلامة الغذاء والجودة",
    },
    {
      number: "24/7",
      label: "دعم فني",
      description: "متاح للمساعدة والاستشارات",
    },
  ];

  // Educational Content
  const educationalContent = [
    {
      id: "edu-1",
      title: "أساسيات نظام HACCP",
      description: "تعرف على المبادئ السبعة الأساسية لنظام HACCP وكيفية تطبيقها في منشأتك.",
      icon: "🎯",
      category: "أساسيات",
    },
    {
      id: "edu-2",
      title: "الممارسات الصحية الجيدة (GHP)",
      description: "دليل شامل للممارسات الصحية الجيدة في المصانع الغذائية والمطاعم.",
      icon: "🧼",
      category: "ممارسات",
    },
    {
      id: "edu-3",
      title: "إدارة المخاطر الميكروبية",
      description: "فهم كيفية تحديد ومراقبة المخاطر الميكروبية في سلسلة الإنتاج.",
      icon: "🔬",
      category: "متقدم",
    },
    {
      id: "edu-4",
      title: "التدريب والتوعية",
      description: "أهمية تدريب الموظفين على سلامة الغذاء والممارسات الآمنة.",
      icon: "👥",
      category: "تدريب",
    },
    {
      id: "edu-5",
      title: "التوثيق والسجلات",
      description: "نظام فعال للتوثيق والسجلات يضمن الامتثال والتتبع الكامل.",
      icon: "📋",
      category: "إدارة",
    },
    {
      id: "edu-6",
      title: "المعايير الدولية",
      description: "شرح المعايير الدولية مثل ISO 22000 و FSSC 22000 ومتطلباتها.",
      icon: "🌍",
      category: "معايير",
    },
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "تحليل المخاطر الذكي",
      description: "تحديد ومراقبة نقاط التحكم الحرجة باستخدام الذكاء الاصطناعي",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "تقارير شاملة",
      description: "تقارير تفصيلية وإحصائيات لتتبع الامتثال والأداء",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "إدارة الفريق",
      description: "تنظيم المهام والمسؤوليات بين أعضاء الفريق",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "أتمتة العمليات",
      description: "أتمتة المهام المتكررة وتوفير الوقت والموارد",
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold">
              A
            </div>
            <span className="font-bold text-lg hidden sm:inline">Alazwak</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              تسجيل الدخول
            </Button>
            <Button onClick={() => navigate("/auth")}>
              ابدأ الآن
              <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                مساعدك الذكي لسلامة الغذاء
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                منصة متكاملة لإدارة سلامة الغذاء والامتثال للمعايير الدولية. تطبيق نظام HACCP بسهولة وحصل على
                الشهادات المطلوبة
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-base h-12 px-8"
              >
                ابدأ مجاناً
                <ArrowRight className="w-5 h-5 mr-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-12 px-8"
              >
                تعرف على المزيد
                <ChevronDown className="w-5 h-5 mr-2" />
              </Button>
            </div>

            <div className="pt-8 grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-bold text-2xl text-primary">500+</div>
                <div className="text-muted-foreground">منشأة غذائية</div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-2xl text-primary">95%</div>
                <div className="text-muted-foreground">معدل الامتثال</div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-2xl text-primary">24/7</div>
                <div className="text-muted-foreground">دعم فني</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold">المميزات الرئيسية</h2>
            <p className="text-muted-foreground text-lg">
              أدوات قوية مصممة لتسهيل إدارة سلامة الغذاء والامتثال للمعايير
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20">
        <div className="container space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">أرقام وإحصائيات</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              نحن فخورون بالإنجازات التي حققناها مع عملائنا
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statistics.map((stat, idx) => (
              <Card key={idx} className="text-center border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="space-y-4">
                    <div className="text-4xl font-bold text-primary">{stat.number}</div>
                    <CardTitle className="text-lg">{stat.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-card/50">
        <div className="container space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">آراء العملاء</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              استمع إلى ما يقوله عملاؤنا عن تجربتهم مع Alazwak
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{testimonial.image}</div>
                      <div>
                        <CardTitle className="text-base">{testimonial.name}</CardTitle>
                        <CardDescription className="text-xs">{testimonial.role}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold">أسئلة شائعة</h2>
            <p className="text-muted-foreground text-lg">
              إجابات على الأسئلة الشائعة حول سلامة الغذاء والمعايير الدولية
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible value={expandedFaq || ""} onValueChange={setExpandedFaq}>
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border-border/50">
                  <AccordionTrigger className="text-right hover:text-primary transition-colors">
                    <span className="font-semibold text-base">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Educational Content Section */}
      <section className="py-20 bg-card/50">
        <div className="container space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">محتوى تعليمي</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              موارد تعليمية شاملة لفهم سلامة الغذاء والممارسات الآمنة
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {educationalContent.map((content) => (
              <Card
                key={content.id}
                className="border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
              >
                <CardHeader>
                  <div className="space-y-4">
                    <div className="text-5xl group-hover:scale-110 transition-transform">{content.icon}</div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-primary bg-primary/10 w-fit px-2 py-1 rounded">
                        {content.category}
                      </div>
                      <CardTitle className="text-lg">{content.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{content.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">هل أنت مستعد للبدء؟</h2>
              <p className="text-lg opacity-90">
                انضم إلى مئات المنشآت الغذائية التي تثق بـ Alazwak لإدارة سلامة الغذاء
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/auth")}
                className="text-base h-12 px-8"
              >
                ابدأ مجاناً الآن
                <ArrowRight className="w-5 h-5 mr-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-12 px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                تواصل معنا
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold">
                  A
                </div>
                <span className="font-bold">Alazwak</span>
              </div>
              <p className="text-sm text-muted-foreground">
                منصة ذكية لإدارة سلامة الغذاء والامتثال للمعايير الدولية
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">المنتج</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    المميزات
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    الأسعار
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    الأمان
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">الموارد</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    المدونة
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    التوثيق
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    الدعم
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">الشركة</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    حول Alazwak
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    التوظيف
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    اتصل بنا
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; 2024 Alazwak. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">
                سياسة الخصوصية
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                شروط الخدمة
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
