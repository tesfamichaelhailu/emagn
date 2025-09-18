import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Users,
  CreditCard,
  MessageSquare,
  ArrowRight,
  Star,
} from "lucide-react";

export const Home = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation("common");

  const features = [
    {
      icon: Shield,
      title: t("home.why.features.secureEscrowTitle"),
      description: t("home.why.features.secureEscrowDesc"),
    },
    {
      icon: Users,
      title: t("home.why.features.trustedCommunityTitle"),
      description: t("home.why.features.trustedCommunityDesc"),
    },
    {
      icon: CreditCard,
      title: t("home.why.features.easyTransactionsTitle"),
      description: t("home.why.features.easyTransactionsDesc"),
    },
    {
      icon: MessageSquare,
      title: t("home.why.features.disputeResolutionTitle"),
      description: t("home.why.features.disputeResolutionDesc"),
    },
  ];

  const stats = [
    { label: t("home.stats.activeUsers"), value: "10,000+" },
    { label: t("home.stats.productsListed"), value: "50,000+" },
    { label: t("home.stats.successfulTransactions"), value: "100,000+" },
    { label: t("home.stats.disputeResolutionRate"), value: "99.5%" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Buyer",
      content:
        "Emagn made my first online purchase worry-free. The escrow system gave me confidence that my money was safe.",
      rating: 5,
    },
    {
      name: "Mike Chen",
      role: "Seller",
      content:
        "As a seller, I love how Emagn handles disputes professionally. It protects both me and my customers.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Buyer",
      content:
        "The platform is intuitive and secure. I can shop with confidence knowing my transactions are protected.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t("home.hero.title1")}
              <span className="block text-primary-200">
                {t("home.hero.title2")}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              {t("home.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/products"
                    className="btn btn-lg bg-white text-primary-600 hover:bg-primary-50"
                  >
                    {t("home.hero.browse")}
                  </Link>
                  <Link
                    to="/dashboard"
                    className="btn btn-lg border-2 border-white text-white hover:bg-white hover:text-primary-600"
                  >
                    {t("home.hero.dashboard")}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn btn-lg bg-white text-primary-600 hover:bg-primary-50"
                  >
                    {t("home.hero.getStarted")}
                  </Link>
                  <Link
                    to="/products"
                    className="btn btn-lg border-2 border-white text-white hover:bg-white hover:text-primary-600"
                  >
                    {t("home.hero.browse")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("home.why.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("home.why.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card p-6 text-center hover:shadow-medium transition-shadow"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("home.how.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("home.how.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("home.how.step1Title")}
              </h3>
              <p className="text-gray-600">{t("home.how.step1Desc")}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("home.how.step2Title")}
              </h3>
              <p className="text-gray-600">{t("home.how.step2Desc")}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("home.how.step3Title")}
              </h3>
              <p className="text-gray-600">{t("home.how.step3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("home.testimonials.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("home.testimonials.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("home.cta.title")}
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            {t("home.cta.subtitle")}
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="btn btn-lg bg-white text-primary-600 hover:bg-primary-50 inline-flex items-center"
            >
              {t("home.cta.createAccount")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};
