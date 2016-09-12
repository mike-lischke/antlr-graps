/*
 * MIT License
 *
 * Copyright (c) 2016 Mike Lischke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

#pragma once

#include <string>

#include <node.h>
#include <node_object_wrap.h>

#include "SourceContextImpl.h"

#pragma GCC visibility push(default)

// A context for a single code source environment (usually a file).
class SourceContext : public node::ObjectWrap, public graps::SourceContextImpl
{
public:
  static void init(v8::Local<v8::Object> exports);

protected:
  static v8::Persistent<v8::Function> constructor;

  SourceContext(std::string const& sourceId);
  virtual ~SourceContext();

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args);

  static void infoForSymbolAtPosition(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void parse(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void addDependency(const v8::FunctionCallbackInfo<v8::Value>& args);
};

#pragma GCC visibility pop
